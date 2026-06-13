const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const prisma = require('../lib/prisma')
const { requireAgent } = require('../middleware/auth')

const recStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve('recordings')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => cb(null, `${req.params.recordingId}.webm`),
})
const uploadRec = multer({ storage: recStorage, limits: { fileSize: 500 * 1024 * 1024 } })

const router = express.Router()

router.post('/:id/recording/start', requireAgent, async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id, status: 'ACTIVE' },
    })
    if (!session) return res.status(404).json({ error: 'Active session not found' })

    const existing = await prisma.recording.findFirst({
      where: { sessionId: session.id, status: 'IN_PROGRESS' },
    })
    if (existing) return res.status(409).json({ error: 'Recording already in progress' })

    const recording = await prisma.recording.create({
      data: { sessionId: session.id, status: 'IN_PROGRESS' },
    })

    res.json({ recordingId: recording.id, status: 'IN_PROGRESS' })
  } catch (err) {
    console.error('Start recording error:', err)
    res.status(500).json({ error: 'Failed to start recording' })
  }
})

router.post('/:id/recording/stop', requireAgent, async (req, res) => {
  const { recordingId } = req.body
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const recording = await prisma.recording.findFirst({
      where: { id: recordingId, sessionId: session.id, status: 'IN_PROGRESS' },
    })
    if (!recording) return res.status(404).json({ error: 'Active recording not found' })

    const updated = await prisma.recording.update({
      where: { id: recording.id },
      data: { status: 'PROCESSING' },
    })

    res.json({ recordingId: recording.id, status: 'PROCESSING' })
  } catch (err) {
    console.error('Stop recording error:', err)
    res.status(500).json({ error: 'Failed to stop recording' })
  }
})

router.post('/:id/recording/:recordingId/upload', requireAgent, uploadRec.single('recording'), async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    // Verify the recording exists and belongs to this session
    const recording = await prisma.recording.findFirst({
      where: { id: req.params.recordingId, sessionId: session.id },
    })
    if (!recording) return res.status(404).json({ error: 'Recording not found' })

    await prisma.recording.update({
      where: { id: req.params.recordingId },
      data: { status: 'READY', filePath: req.file.path },
    })

    res.json({ status: 'READY', filePath: req.file.path })
  } catch (err) {
    console.error('Upload recording error:', err)
    // If upload fails, mark recording as failed so it's not stuck at PROCESSING
    try {
      await prisma.recording.update({
        where: { id: req.params.recordingId },
        data: { status: 'FAILED' },
      }).catch(() => {})
    } catch {}
    res.status(500).json({ error: 'Failed to save recording' })
  }
})

router.get('/:id/recording/download', requireAgent, async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const recording = await prisma.recording.findFirst({
      where: { sessionId: session.id, status: 'READY' },
      orderBy: { createdAt: 'desc' },
    })
    if (!recording || !recording.filePath) {
      return res.status(404).json({ error: 'No ready recording found' })
    }

    const filePath = path.resolve(recording.filePath)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Recording file not found on disk' })
    }

    res.download(filePath, `recording-${session.id}.webm`)
  } catch (err) {
    console.error('Download recording error:', err)
    res.status(500).json({ error: 'Failed to download recording' })
  }
})

module.exports = router
