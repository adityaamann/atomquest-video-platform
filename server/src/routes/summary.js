const express = require('express')
const prisma = require('../lib/prisma')
const { requireAgent } = require('../middleware/auth')

const router = express.Router()

const POSITIVE_WORDS = new Set([
  'thanks', 'thank', 'great', 'resolved', 'good', 'perfect', 'excellent',
  'awesome', 'happy', 'helpful', 'solved', 'fixed', 'works', 'working',
  'appreciate', 'wonderful', 'amazing', 'fantastic', 'glad', 'pleased',
])

const NEGATIVE_WORDS = new Set([
  'problem', 'issue', 'broken', 'error', 'fail', 'failed', 'bad',
  'terrible', 'awful', 'frustrated', 'stuck', 'cant', 'cannot', 'doesnt',
  'wrong', 'difficult', 'hard', 'worst', 'annoying',
])

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'i', 'you', 'it', 'to', 'and', 'or', 'in',
  'on', 'at', 'that', 'this', 'of', 'for', 'with', 'my', 'me', 'we',
  'he', 'she', 'they', 'be', 'are', 'was', 'were', 'do', 'did', 'have',
  'has', 'had', 'will', 'would', 'can', 'could', 'should', 'may', 'might',
  'so', 'as', 'but', 'no', 'yes', 'ok', 'okay', 'hi', 'hello', 'bye',
  'please', 'just', 'your', 'our', 'what', 'how', 'when', 'where', 'why',
  'who', 'if', 'up', 'out', 'about', 'all', 'from', 'its', 'im', 'ive',
  'got', 'get', 'see', 'let', 'try', 'now', 'here', 'there', 'then',
  'than', 'also', 'very', 'too', 'more', 'one', 'two', 'any', 'some',
  'much', 'many', 'into', 'over', 'after', 'before', 'while', 'by',
  'back', 'still', 'need', 'know', 'think', 'going', 'thing', 'time',
  'sure', 'right', 'yeah', 'well', 'like', 'want', 'make', 'really',
  'dont', 'ill', 'new', 'old', 'not',
])

function durationString(seconds) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function analyzeMessages(messages, agentEmail) {
  let agentMessages = 0
  let customerMessages = 0
  let positiveSignals = 0
  let negativeSignals = 0
  const wordFreq = {}

  for (const msg of messages) {
    if (msg.senderName === agentEmail) {
      agentMessages++
    } else {
      customerMessages++
    }

    const words = msg.content.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    for (const w of words) {
      if (!w || w.length < 3) continue
      if (POSITIVE_WORDS.has(w)) positiveSignals++
      if (NEGATIVE_WORDS.has(w)) negativeSignals++
      if (!STOP_WORDS.has(w) && w.length >= 4) {
        wordFreq[w] = (wordFreq[w] || 0) + 1
      }
    }
  }

  const keywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }))

  const net = positiveSignals - negativeSignals
  const sentiment = net >= 2 ? 'positive' : net <= -2 ? 'negative' : 'neutral'

  return { agentMessages, customerMessages, positiveSignals, negativeSignals, keywords, sentiment }
}

router.get('/:id/insights', requireAgent, async (req, res) => {
  try {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, agentId: req.user.id },
      include: {
        messages: { orderBy: { sentAt: 'asc' } },
        agent: { select: { email: true } },
      },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { agentMessages, customerMessages, positiveSignals, negativeSignals, keywords, sentiment } =
      analyzeMessages(session.messages, session.agent?.email)

    res.json({
      totalMessages: session.messages.length,
      agentMessages,
      customerMessages,
      duration: durationString(session.duration),
      sentiment,
      positiveSignals,
      negativeSignals,
      keywords,
    })
  } catch (err) {
    console.error('Insights error:', err)
    res.status(500).json({ error: 'Failed to compute insights' })
  }
})

module.exports = router
