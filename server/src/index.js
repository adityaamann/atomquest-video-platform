require('dotenv').config()

// ── Env validation — fail fast before anything imports ──────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET']
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k])
if (missingEnv.length) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`)
  console.error('[FATAL] Check your .env file. See .env.example for reference.')
  process.exit(1)
}

// ── Crash guards ─────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error('[ERROR] Unhandled promise rejection:', reason)
})

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const fs = require('fs')

const authRoutes = require('./routes/auth')
const sessionsRoutes = require('./routes/sessions')
const joinRoutes = require('./routes/join')
const recordingRoutes = require('./routes/recording')
const fileRoutes = require('./routes/files')
const createAdminRouter = require('./routes/admin')
const createMetricsRouter = require('./routes/metrics')
const summaryRoutes = require('./routes/summary')
const registerSocketHandlers = require('./socket/handlers')

const app = express()
const server = http.createServer(app)

// Support comma-separated origins for multi-domain deploys
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  maxHttpBufferSize: 5e6,
})

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// ── Ensure storage directories exist ─────────────────────────────────────────
const recordingsDir = path.resolve('recordings')
const uploadsDir = path.resolve('uploads')
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true })
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

app.use('/recordings', express.static(recordingsDir))

// ── Register Socket.io handlers ───────────────────────────────────────────────
registerSocketHandlers(io)

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/join', joinRoutes)
app.use('/api/sessions', recordingRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/admin', createAdminRouter(io))
app.use('/api/metrics', createMetricsRouter(registerSocketHandlers))
app.use('/api/sessions', summaryRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }))

// ── Global Express error handler ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Express error]', req.method, req.path, err.message)
  const status = err.status || err.statusCode || 500
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error'
  if (!res.headersSent) res.status(status).json({ error: message })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}  (NODE_ENV=${process.env.NODE_ENV || 'development'})`)
})
