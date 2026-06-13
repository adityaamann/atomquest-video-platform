const express = require('express')
const prisma = require('../lib/prisma')
const { requireAgent } = require('../middleware/auth')

module.exports = function createAdminRouter(io) {
  const router = express.Router()

  router.get('/sessions', requireAgent, async (req, res) => {
    try {
      const [active, ended] = await Promise.all([
        prisma.session.findMany({
          where: { status: 'ACTIVE' },
          include: {
            agent: { select: { id: true, email: true } },
            participants: true,
            _count: { select: { messages: true } },
          },
          orderBy: { startedAt: 'desc' },
        }),
        prisma.session.findMany({
          where: { status: 'ENDED' },
          include: {
            agent: { select: { id: true, email: true } },
            participants: true,
            _count: { select: { messages: true } },
          },
          orderBy: { startedAt: 'desc' },
          take: 50,
        }),
      ])
      res.json({ active, ended })
    } catch (err) {
      console.error('Admin sessions error:', err)
      res.status(500).json({ error: 'Failed to fetch sessions' })
    }
  })

  router.get('/sessions/export', requireAgent, async (req, res) => {
    try {
      const sessions = await prisma.session.findMany({
        include: { agent: { select: { email: true } }, participants: true, _count: { select: { messages: true } } },
        orderBy: { startedAt: 'desc' },
      })

      const rows = [
        ['Session ID', 'Agent', 'Status', 'Started (IST)', 'Ended (IST)', 'Duration (s)', 'Participants', 'Messages'],
        ...sessions.map(s => [
          s.id,
          s.agent?.email || '',
          s.status,
          new Date(s.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          s.endedAt ? new Date(s.endedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
          s.duration || '',
          s.participants.length,
          s._count.messages,
        ]),
      ]

      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="sessions-export.csv"')
      res.send(csv)
    } catch (err) {
      console.error('Export error:', err)
      res.status(500).json({ error: 'Export failed' })
    }
  })

  router.post('/sessions/:id/force-end', requireAgent, async (req, res) => {
    try {
      const session = await prisma.session.findUnique({ where: { id: req.params.id } })
      if (!session) return res.status(404).json({ error: 'Session not found' })
      if (session.status === 'ENDED') return res.status(400).json({ error: 'Already ended' })

      const endedAt = new Date()
      const duration = Math.floor((endedAt - session.startedAt) / 1000)

      await Promise.all([
        prisma.session.update({
          where: { id: session.id },
          data: { status: 'ENDED', endedAt, duration },
        }),
        prisma.participant.updateMany({
          where: { sessionId: session.id, leftAt: null },
          data: { leftAt: endedAt },
        }),
      ])

      io.to(`session:${session.id}`).emit('session-ended', { sessionId: session.id })
      io.to('admin').emit('admin-update', { type: 'force-ended', sessionId: session.id })

      res.json({ ok: true })
    } catch (err) {
      console.error('Force-end error:', err)
      res.status(500).json({ error: 'Failed to force end session' })
    }
  })

  return router
}
