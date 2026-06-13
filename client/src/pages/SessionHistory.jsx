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
