import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

const SENTIMENT_STYLE = {
  positive: 'text-green-400 bg-green-900/20 border-green-800',
  neutral:  'text-blue-400 bg-blue-900/20 border-blue-800',
  negative: 'text-red-400 bg-red-900/20 border-red-800',
}

const SENTIMENT_ICON = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
}

function StatBox({ label, value }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-4 py-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function SessionInsightsCard({ sessionId }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/sessions/${sessionId}/insights`)
      .then(({ data }) => setInsights(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load insights'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📊</span>
          <h2 className="font-semibold">Session Insights</h2>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analysing session…
        </div>
      </div>
    )
  }

  if (error || !insights) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📊</span>
          <h2 className="font-semibold">Session Insights</h2>
        </div>
        <p className="text-gray-500 text-sm">{error || 'No insights available'}</p>
      </div>
    )
  }

  return (
    <div className="card border-brand-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h2 className="font-semibold">Session Insights</h2>
        </div>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${SENTIMENT_STYLE[insights.sentiment] || SENTIMENT_STYLE.neutral}`}>
          {SENTIMENT_ICON[insights.sentiment]} {insights.sentiment}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatBox label="Total Messages" value={insights.totalMessages} />
        <StatBox label="Agent Messages" value={insights.agentMessages} />
        <StatBox label="Customer Messages" value={insights.customerMessages} />
        <StatBox label="Duration" value={insights.duration} />
      </div>

      {/* Sentiment signals */}
      <div className="flex items-center gap-4 mb-5 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-400">{insights.positiveSignals} positive signals</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-gray-400">{insights.negativeSignals} negative signals</span>
        </div>
      </div>

      {/* Keywords */}
      {insights.keywords?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-medium">Top Keywords</p>
          <div className="flex flex-wrap gap-2">
            {insights.keywords.map(({ word, count }) => (
              <span key={word} className="inline-flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-xs text-gray-300">
                {word}
                <span className="text-gray-600 ml-0.5">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SessionHistory() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadStatus, setDownloadStatus] = useState({})

  useEffect(() => {
    api.get(`/api/sessions/${id}`)
      .then(({ data }) => setSession(data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load session'))
      .finally(() => setLoading(false))
  }, [id])

  async function downloadRecording(recordingId) {
    setDownloadStatus(prev => ({ ...prev, [recordingId]: 'loading' }))
    try {
      const response = await api.get(`/api/sessions/${id}/recording/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `recording-${id}.webm`
      a.click()
      URL.revokeObjectURL(url)
      setDownloadStatus(prev => ({ ...prev, [recordingId]: 'done' }))
      toast.success('Recording downloaded!')
    } catch (err) {
      setDownloadStatus(prev => ({ ...prev, [recordingId]: 'error' }))
      toast.error(err.response?.data?.error || 'Download failed')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading session...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>
  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Session History</h1>
          <p className="text-gray-500 text-sm mt-1">Session {id.slice(0, 12)}…</p>
        </div>

        {/* Overview */}
        <div className="card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <span className={`text-sm font-semibold ${session.status === 'ACTIVE' ? 'text-green-400' : 'text-gray-300'}`}>
                {session.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Started</p>
              <p className="text-sm">{new Date(session.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
              <p className="text-sm font-mono">{formatDuration(session.duration)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Agent</p>
              <p className="text-sm truncate">{session.agent?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Participants */}
          <div className="card">
            <h2 className="font-semibold mb-4">Participants ({session.participants?.length || 0})</h2>
            {session.participants?.length === 0 ? (
              <p className="text-gray-500 text-sm">No participants recorded</p>
            ) : (
              <div className="space-y-3">
                {session.participants?.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p.role === 'AGENT' ? 'bg-brand-500' : 'bg-blue-400'}`} />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-gray-500 text-xs">{p.role}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>In: {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      {p.leftAt && <p>Out: {new Date(p.leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recording */}
          <div className="card">
            <h2 className="font-semibold mb-4">Recording</h2>
            {session.recordings?.length === 0 ? (
              <p className="text-gray-500 text-sm">No recording for this session</p>
            ) : (
              <div className="space-y-3">
                {session.recordings?.map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div>
                      <span className={`text-sm font-medium ${r.status === 'READY' ? 'text-green-400' : r.status === 'PROCESSING' ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {r.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                    {r.status === 'READY' && (
                      <button onClick={() => downloadRecording(r.id)} className="btn-secondary text-sm py-1.5 px-3">
                        {downloadStatus[r.id] === 'loading' ? 'Downloading…' : '↓ Download'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session Insights */}
        <SessionInsightsCard sessionId={id} />

        {/* Chat transcript */}
        <div className="card">
          <h2 className="font-semibold mb-4">Chat Transcript ({session.messages?.length || 0} messages)</h2>
          {session.messages?.length === 0 ? (
            <p className="text-gray-500 text-sm">No chat messages in this session</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {session.messages?.map(msg => (
                <div key={msg.id} className="flex gap-3 text-sm">
                  <span className="text-gray-600 shrink-0 text-xs pt-0.5 w-10">
                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <span className="font-medium text-brand-400">{msg.senderName}: </span>
                    <span className="text-gray-300">{msg.content}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-700 py-6">AtomQuest Hackathon 2026 · SupportVision</footer>
    </div>
  )
}
