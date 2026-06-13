import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

const SENTIMENT_STYLE = {
  positive: 'bg-green-50 border-green-200 text-green-700',
  neutral: 'bg-blue-50 border-blue-200 text-blue-700',
  negative: 'bg-red-50 border-red-200 text-red-700',
}

const SENTIMENT_ICON = { positive: '😊', neutral: '😐', negative: '😟' }

function InsightStat({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center">
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
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
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="font-semibold text-slate-900">Session Insights</h2>
        </div>
        <div className="skeleton h-24 rounded-xl" />
      </div>
    )
  }

  if (error || !insights) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="font-semibold text-slate-900">Session Insights</h2>
        </div>
        <p className="text-slate-500 text-sm">{error || 'No insights available for this session'}</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="font-semibold text-slate-900">Session Insights</h2>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${SENTIMENT_STYLE[insights.sentiment] || SENTIMENT_STYLE.neutral}`}>
          {SENTIMENT_ICON[insights.sentiment]} {insights.sentiment}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <InsightStat label="Total Messages" value={insights.totalMessages} />
        <InsightStat label="Agent Messages" value={insights.agentMessages} />
        <InsightStat label="Customer Messages" value={insights.customerMessages} />
        <InsightStat label="Duration" value={insights.duration} />
      </div>

      <div className="flex items-center gap-5 mb-5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-600">{insights.positiveSignals} positive signals</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-slate-600">{insights.negativeSignals} negative signals</span>
        </div>
      </div>

      {insights.keywords?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Top Keywords</p>
          <div className="flex flex-wrap gap-2">
            {insights.keywords.map(({ word, count }) => (
              <span key={word} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-700">
                {word}
                <span className="text-slate-400 ml-0.5">×{count}</span>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="card text-center py-12">
            <p className="text-red-500 font-medium">{error}</p>
            <Link to="/dashboard" className="btn-primary mt-4 inline-flex">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const PRIORITY_CLASS = {
    LOW: 'priority-low', MEDIUM: 'priority-medium', HIGH: 'priority-high', URGENT: 'priority-urgent',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 page-enter space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{session.title || 'Session Details'}</span>
        </div>

        {/* Header card */}
        <div className="card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{session.title || 'Support Session'}</h1>
              <p className="text-slate-500 text-sm mt-1">
                {session.customerName && <span className="font-medium text-slate-700">{session.customerName}</span>}
                {session.customerEmail && <span className="text-slate-400"> · {session.customerEmail}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {session.priority && <span className={PRIORITY_CLASS[session.priority] || 'priority-medium'}>{session.priority}</span>}
              {session.status === 'ACTIVE'
                ? <span className="badge-active"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />Live</span>
                : <span className="badge-ended">Ended</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Agent</p>
              <p className="text-sm text-slate-700 truncate">{session.agent?.name || session.agent?.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Started</p>
              <p className="text-sm text-slate-700">{new Date(session.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-sm font-mono text-slate-700">{formatDuration(session.duration)}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Participants */}
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Participants ({session.participants?.length || 0})</h2>
            {!session.participants?.length ? (
              <p className="text-slate-500 text-sm">No participants recorded</p>
            ) : (
              <div className="space-y-3">
                {session.participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        p.role === 'AGENT' ? 'bg-primary-600' : 'bg-slate-500'
                      }`}>
                        {p.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.role}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
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
            <h2 className="font-semibold text-slate-900 mb-4">Recording</h2>
            {!session.recordings?.length ? (
              <p className="text-slate-500 text-sm">No recording for this session</p>
            ) : (
              <div className="space-y-3">
                {session.recordings.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className={`text-sm font-semibold ${
                        r.status === 'READY' ? 'text-green-600'
                        : r.status === 'PROCESSING' ? 'text-yellow-600'
                        : r.status === 'FAILED' ? 'text-red-500'
                        : 'text-slate-500'
                      }`}>{r.status === 'FAILED' ? 'Upload Failed' : r.status}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                    {r.status === 'READY' && (
                      <button onClick={() => downloadRecording(r.id)} className="btn-secondary text-sm py-1.5 px-3">
                        {downloadStatus[r.id] === 'loading' ? 'Saving…' : '↓ Download'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <SessionInsightsCard sessionId={id} />

        {/* Chat transcript */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Chat Transcript ({session.messages?.length || 0} messages)</h2>
          {!session.messages?.length ? (
            <p className="text-slate-500 text-sm">No chat messages in this session</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {session.messages.map(msg => (
                <div key={msg.id} className="flex gap-3 text-sm">
                  <span className="text-slate-400 shrink-0 text-xs pt-0.5 w-12 tabular-nums">
                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <span className="font-semibold text-primary-600">{msg.senderName}: </span>
                    <span className="text-slate-700">{msg.content}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
