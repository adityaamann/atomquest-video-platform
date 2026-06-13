const express = require('express')
const { v4: uuidv4 } = require('uuid')
const prisma = require('../lib/prisma')
const { requireAgent } = require('../middleware/auth')

const router = express.Router()

router.post('/', requireAgent, async (req, res) => {
  try {
    const existing = await prisma.session.findFirst({
      where: { agentId: req.user.id, status: 'ACTIVE' },
      include: { agent: { select: { id: true, email: true } } },
      orderBy: { startedAt: 'desc' },
    })
    if (existing) return res.status(200).json(existing)

    const session = await prisma.session.create({
      data: {
        agentId: req.user.id,
        inviteToken: uuidv4(),
        status: 'ACTIVE',
      },
      include: { agent: { select: { id: true, email: true } } },
    })
    res.status(201).json(session)
  } catch (err) {
    console.error('Create session error:', err)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

router.get('/', requireAgent, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { agentId: req.user.id },
      include: {
        participants: true,
        recordings: { select: { id: true, status: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { startedAt: 'desc' },
    })
    res.json(sessions)
  } catch (err) {
    console.error('List sessions error:', err)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

router.get('/:id', requireAgent, async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id },
      include: {
        participants: true,
        messages: { orderBy: { sentAt: 'asc' } },
        recordings: true,
        agent: { select: { id: true, email: true } },
      },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (err) {
    console.error('Get session error:', err)
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

router.post('/:id/end', requireAgent, async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (session.status === 'ENDED') return res.status(400).json({ error: 'Session already ended' })

    const endedAt = new Date()
    const duration = Math.floor((endedAt - session.startedAt) / 1000)

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: { status: 'ENDED', endedAt, duration },
    })

    await prisma.participant.updateMany({
      where: { sessionId: session.id, leftAt: null },
      data: { leftAt: endedAt },
    })

    res.json(updated)
  } catch (err) {
    console.error('End session error:', err)
    res.status(500).json({ error: 'Failed to end session' })
  }
})

module.exports = router
