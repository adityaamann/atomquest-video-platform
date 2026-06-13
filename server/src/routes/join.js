const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

router.get('/:token', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { inviteToken: req.params.token },
      include: { agent: { select: { id: true, email: true } } },
    })
    if (!session) return res.status(404).json({ error: 'Invalid or expired invite link' })
    if (session.status === 'ENDED') return res.status(410).json({ error: 'This session has ended' })

    res.json({
      sessionId: session.id,
      agentEmail: session.agent.email,
      startedAt: session.startedAt,
      token: req.params.token,
    })
  } catch (err) {
    console.error('Join validate error:', err)
    res.status(500).json({ error: 'Failed to validate invite' })
  }
})

module.exports = router
