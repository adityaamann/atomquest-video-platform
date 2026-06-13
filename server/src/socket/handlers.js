const fs = require('fs')
const path = require('path')
const prisma = require('../lib/prisma')

// Map of sessionId → { participants: Map<socketId, {name, role}>, recordingBuffers: Map<recordingId, Buffer[]> }
const sessionState = new Map()

// Feature 2: reconnect grace timers — key: `${sessionId}:${name}` → { timer }
const disconnectTimers = new Map()

// Feature 4: metrics cache
let _metricsCache = null
let _metricsCacheTime = 0
const METRICS_TTL = 60 * 1000

async function refreshMetrics(io) {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)

  const [activeSessions, todaySessions, endedToday, badEnded, totalEnded] = await Promise.all([
    prisma.session.count({ where: { status: 'ACTIVE' } }),
    prisma.session.count({ where: { startedAt: { gte: midnight } } }),
    prisma.session.findMany({
      where: { status: 'ENDED', startedAt: { gte: midnight }, duration: { not: null } },
      select: { duration: true },
    }),
    prisma.session.count({ where: { status: 'ENDED', endedAt: null } }),
    prisma.session.count({ where: { status: 'ENDED' } }),
  ])

  let connectedParticipants = 0
  for (const [, state] of sessionState) connectedParticipants += state.participants.size

  const avgDuration =
    endedToday.length > 0
      ? endedToday.reduce((s, r) => s + (r.duration || 0), 0) / endedToday.length / 60
      : 0

  const errorRate = totalEnded > 0 ? (badEnded / totalEnded) * 100 : 0

  _metricsCache = {
    activeSessions,
    connectedParticipants,
    totalSessionsToday: todaySessions,
    averageSessionDuration: Math.round(avgDuration * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    updatedAt: new Date(),
  }
  _metricsCacheTime = Date.now()

  if (io) io.to('admin').emit('metrics-update', _metricsCache)
  return _metricsCache
}

function getOrCreateSession(sessionId) {
  if (!sessionState.has(sessionId)) {
    sessionState.set(sessionId, { participants: new Map(), recordingBuffers: new Map() })
  }
  return sessionState.get(sessionId)
}

function registerSocketHandlers(io) {
  // Feature 4: broadcast metrics to admin room every 30s
  const metricsInterval = setInterval(() => {
    refreshMetrics(io).catch(console.error)
  }, 30000)

  // Clean up timers on shutdown to prevent memory leaks
  function cleanup() {
    clearInterval(metricsInterval)
    for (const { timer } of disconnectTimers.values()) clearTimeout(timer)
  }
  process.once('SIGTERM', cleanup)
  process.once('SIGINT', cleanup)

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('ping-check', () => socket.emit('pong-check'))

    // Feature 1: Admin room join
    socket.on('join-admin', () => {
      socket.join('admin')
      refreshMetrics(io).catch(console.error)
      console.log(`Admin joined: ${socket.id}`)
    })

    // ─── Join Session ──────────────────────────────────────────────────────────
    socket.on('join-session', async ({ sessionId, name, role, userId }) => {
      const room = `session:${sessionId}`

      try {
        const session = await prisma.session.findUnique({ where: { id: sessionId } })
        if (!session || session.status === 'ENDED') {
          socket.emit('error', { message: 'Session not found or already ended' })
          return
        }

        // Feature 2: check if this is a reconnect within grace period
        const reconnectKey = `${sessionId}:${name}`
        if (disconnectTimers.has(reconnectKey)) {
          const { timer } = disconnectTimers.get(reconnectKey)
          clearTimeout(timer)
          disconnectTimers.delete(reconnectKey)

          socket.join(room)
          socket.sessionId = sessionId
          socket.participantName = name
          socket.participantRole = role
          socket.userId = userId || null

          const state = getOrCreateSession(sessionId)
          state.participants.set(socket.id, { name, role, userId })

          const others = Array.from(state.participants.entries())
            .filter(([sid]) => sid !== socket.id)
            .map(([sid, p]) => ({ socketId: sid, ...p }))
          socket.emit('room-state', { participants: others })

          console.log(`${name} reconnected to session ${sessionId} (grace period cleared)`)
          return
        }

        socket.join(room)
        socket.sessionId = sessionId
        socket.participantName = name
        socket.participantRole = role
        socket.userId = userId || null

        const state = getOrCreateSession(sessionId)
        state.participants.set(socket.id, { name, role, userId })

        await prisma.participant.create({
          data: {
            sessionId,
            userId: userId || null,
            name,
            role,
            joinedAt: new Date(),
          },
        })

        // Tell the room someone joined
        socket.to(room).emit('user-joined', {
          socketId: socket.id,
          name,
          role,
        })

        // Feature 1: notify admin room
        io.to('admin').emit('admin-update', { type: 'user-joined', sessionId })

        // Tell the joiner who's already in the room
        const others = Array.from(state.participants.entries())
          .filter(([sid]) => sid !== socket.id)
          .map(([sid, p]) => ({ socketId: sid, ...p }))

        socket.emit('room-state', { participants: others })

        console.log(`${name} (${role}) joined session ${sessionId}`)
      } catch (err) {
        console.error('join-session error:', err)
        socket.emit('error', { message: 'Failed to join session' })
      }
    })

    // ─── WebRTC Signaling Relay ────────────────────────────────────────────────
    socket.on('signal', ({ targetSocketId, signal }) => {
      io.to(targetSocketId).emit('signal', {
        fromSocketId: socket.id,
        signal,
      })
    })

    // ─── Media Chunk Relay (Server-Side Media Routing) ────────────────────────
    socket.on('media-chunk', ({ sessionId, chunk, mimeType }) => {
      const room = `session:${sessionId}`
      socket.to(room).emit('media-chunk', {
        fromSocketId: socket.id,
        chunk,
        mimeType,
      })

      // Buffer chunks for recording if a recording is active
      const state = sessionState.get(sessionId)
      if (state) {
        for (const [recordingId, buffers] of state.recordingBuffers.entries()) {
          if (Buffer.isBuffer(chunk)) {
            buffers.push(chunk)
          } else if (chunk instanceof ArrayBuffer) {
            buffers.push(Buffer.from(chunk))
          }
        }
      }
    })

    // ─── Media State Change (mute / camera toggle indicators) ────────────────
    socket.on('media-state-change', ({ sessionId, audioEnabled, videoEnabled }) => {
      if (socket.sessionId !== sessionId) return
      socket.to(`session:${sessionId}`).emit('peer-media-state', {
        socketId: socket.id,
        audioEnabled,
        videoEnabled,
      })
    })

    // ─── Typing Indicators ───────────────────────────────────────────────────
    socket.on('typing-start', ({ sessionId }) => {
      if (socket.sessionId !== sessionId) return
      socket.to(`session:${sessionId}`).emit('peer-typing', {
        socketId: socket.id,
        name: socket.participantName,
        typing: true,
      })
    })

    socket.on('typing-stop', ({ sessionId }) => {
      if (socket.sessionId !== sessionId) return
      socket.to(`session:${sessionId}`).emit('peer-typing', {
        socketId: socket.id,
        name: socket.participantName,
        typing: false,
      })
    })

    // ─── Chat ─────────────────────────────────────────────────────────────────
    // Feature 3: accept optional fileUrl and fileType alongside text content
    socket.on('send-message', async ({ sessionId, content, fileUrl, fileType }) => {
      if (!content?.trim() && !fileUrl) return
      // Security: only allow sending to the session this socket belongs to
      if (socket.sessionId !== sessionId) return
      const room = `session:${sessionId}`

      try {
        const data = {
          sessionId,
          senderId: socket.userId || null,
          senderName: socket.participantName || 'Unknown',
          content: content?.trim() || '',
          sentAt: new Date(),
        }
        if (fileUrl) {
          data.fileUrl = fileUrl
          data.fileType = fileType || null
        }

        const message = await prisma.chatMessage.create({ data })

        io.to(room).emit('receive-message', {
          id: message.id,
          senderName: message.senderName,
          content: message.content,
          sentAt: message.sentAt,
          fileUrl: message.fileUrl || null,
          fileType: message.fileType || null,
        })
      } catch (err) {
        console.error('send-message error:', err)
      }
    })

    // ─── Recording Control ────────────────────────────────────────────────────
    socket.on('recording-start-ack', ({ sessionId, recordingId }) => {
      const state = getOrCreateSession(sessionId)
      state.recordingBuffers.set(recordingId, [])
      socket.to(`session:${sessionId}`).emit('recording-started', { recordingId })
    })

    socket.on('recording-stop-ack', async ({ sessionId, recordingId }) => {
      const state = sessionState.get(sessionId)
      if (!state) return

      const buffers = state.recordingBuffers.get(recordingId)
      state.recordingBuffers.delete(recordingId)

      if (buffers && buffers.length > 0) {
        const dir = path.resolve('recordings')
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const filePath = path.join(dir, `${recordingId}.webm`)
        fs.writeFileSync(filePath, Buffer.concat(buffers))

        try {
          await prisma.recording.update({
            where: { id: recordingId },
            data: { status: 'READY', filePath },
          })
        } catch (err) {
          console.error('recording update error:', err)
        }
      }

      io.to(`session:${sessionId}`).emit('recording-stopped', { recordingId })
    })

    // ─── End Session ──────────────────────────────────────────────────────────
    socket.on('end-session', async ({ sessionId }) => {
      if (socket.participantRole !== 'AGENT') {
        socket.emit('error', { message: 'Only agents can end sessions' })
        return
      }

      try {
        const endedAt = new Date()
        const session = await prisma.session.findUnique({ where: { id: sessionId } })
        if (!session || session.status === 'ENDED') return

        const duration = Math.floor((endedAt - session.startedAt) / 1000)
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'ENDED', endedAt, duration },
        })
        await prisma.participant.updateMany({
          where: { sessionId, leftAt: null },
          data: { leftAt: endedAt },
        })

        io.to(`session:${sessionId}`).emit('session-ended', { sessionId })
        io.to('admin').emit('admin-update', { type: 'session-ended', sessionId }) // Feature 1
        sessionState.delete(sessionId)
        console.log(`Session ${sessionId} ended by agent`)
      } catch (err) {
        console.error('end-session error:', err)
      }
    })

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { sessionId, participantName, participantRole } = socket
      if (!sessionId) return

      // Remove from in-memory state immediately
      const state = sessionState.get(sessionId)
      if (state) {
        state.participants.delete(socket.id)
        if (state.participants.size === 0) sessionState.delete(sessionId)
      }

      const reconnectKey = `${sessionId}:${participantName}`

      // Feature 2: 30-second grace period before notifying others
      const timer = setTimeout(async () => {
        disconnectTimers.delete(reconnectKey)

        // Must use io.to() here — socket is already disconnected, socket.to() won't work
        io.to(`session:${sessionId}`).emit('user-left', {
          socketId: socket.id,
          name: participantName,
          role: participantRole,
        })
        io.to('admin').emit('admin-update', { type: 'user-left', sessionId }) // Feature 1

        try {
          await prisma.participant.updateMany({
            where: { sessionId, name: participantName, leftAt: null },
            data: { leftAt: new Date() },
          })
        } catch (err) {
          console.error('disconnect cleanup error:', err)
        }

        console.log(`${participantName} grace period expired, marked as left`)
      }, 30000)

      disconnectTimers.set(reconnectKey, { timer })
      console.log(`${participantName} disconnected — 30s grace period started`)
    })
  })
}

// Export helpers for metrics route (Feature 4)
registerSocketHandlers.sessionState = sessionState
registerSocketHandlers.getMetricsCache = () => _metricsCache
registerSocketHandlers.getMetricsCacheTime = () => _metricsCacheTime
registerSocketHandlers.refreshMetrics = refreshMetrics
registerSocketHandlers.METRICS_TTL = METRICS_TTL

module.exports = registerSocketHandlers
