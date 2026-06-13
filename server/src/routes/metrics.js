const express = require('express')
const prisma = require('../lib/prisma')
const { requireAgent } = require('../middleware/auth')

module.exports = function createMetricsRouter(handlers) {
  const router = express.Router()

  router.get('/', requireAgent, async (req, res) => {
    try {
      const agentId = req.user.id
      const midnight = new Date()
      midnight.setHours(0, 0, 0, 0)

      const [activeSessions, todaySessions, endedToday, badEnded, totalEnded] = await Promise.all([
        prisma.session.count({ where: { status: 'ACTIVE', agentId } }),
        prisma.session.count({ where: { agentId, startedAt: { gte: midnight } } }),
        prisma.session.findMany({
          where: { agentId, status: 'ENDED', startedAt: { gte: midnight }, duration: { not: null } },
          select: { duration: true },
        }),
        prisma.session.count({ where: { agentId, status: 'ENDED', endedAt: null } }),
        prisma.session.count({ where: { agentId, status: 'ENDED' } }),
      ])

      const avgDuration =
        endedToday.length > 0
          ? endedToday.reduce((s, r) => s + (r.duration || 0), 0) / endedToday.length / 60
          : 0

      const errorRate = totalEnded > 0 ? (badEnded / totalEnded) * 100 : 0

      res.json({
        activeSessions,
        connectedParticipants: activeSessions,
        totalSessionsToday: todaySessions,
        averageSessionDuration: Math.round(avgDuration * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        updatedAt: new Date(),
      })
    } catch (err) {
      console.error('Metrics error:', err)
      res.status(500).json({ error: 'Failed to fetch metrics' })
    }
  })

  return router
}
