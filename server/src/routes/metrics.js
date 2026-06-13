const express = require('express')
const { requireAgent } = require('../middleware/auth')

module.exports = function createMetricsRouter(handlers) {
  const router = express.Router()

  router.get('/', requireAgent, async (req, res) => {
    try {
      const prisma = require('../lib/prisma')
      const now = Date.now()
      let cache = handlers.getMetricsCache()

      if (!cache || now - handlers.getMetricsCacheTime() > handlers.METRICS_TTL) {
        cache = await handlers.refreshMetrics(null)
      }
      res.json(cache)
    } catch (err) {
      console.error('Metrics error:', err)
      res.status(500).json({ error: 'Failed to fetch metrics' })
    }
  })

  return router
}
