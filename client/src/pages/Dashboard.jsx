import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StatCard({ icon, label, value, color = 'text-brand-500' }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function SessionCard({ session, onNavigate }) {
  const isActive = session.status === 'ACTIVE'
  const customerName = session.participants?.find(p => p.role === 'CUSTOMER')?.name

  return (
    <div className={`card flex items-center justify-between gap-4 transition-colors hover:border-gray-700 ${isActive ? 'border-brand-500/30 bg-gray-900' : ''}`}>
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Status dot */}
        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {isActive ? 'LIVE' : 'ENDED'}
            </span>
            {customerName && (
              <span className="text-xs text-gray-400">with <span className="text-white">{customerName}</span></span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{new Date(session.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span>{session.participants?.length ?? 0} participants</span>
            <span>{session._count?.messages ?? 0} messages</span>
            {session.duration && <span>{formatDuration(session.duration)}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {isActive && (
          <Link to={`/sessions/${session.id}/call`} className="btn-primary text-sm py-1.5 px-3">
            Join →
          </Link>
        )}
        <Link to={`/sessions/${session.id}/history`} className="btn-secondary text-sm py-1.5 px-3">
          History
        </Link>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-16">
      <svg className="w-20 h-20 mx-auto mb-4 text-gray-700" viewBox="0 0 80 80" fill="none">
        <rect x="8" y="20" width="44" height="32" rx="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M52 30l16-8v28l-16-8" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="30" cy="36" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
        <path d="M30 32v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-300 mb-1">No sessions yet</h3>
      <p className="text-gray-500 text-sm mb-6">Start your first support session and share the link with a customer.</p>
      <Link to="/sessions/new" className="btn-primary inline-block px-6">
        Start First Session
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/sessions')
      .then(({ data }) => setSessions(data))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false))
  }, [])

  const activeSessions = sessions.filter(s => s.status === 'ACTIVE')
  const endedSessions = sessions.filter(s => s.status === 'ENDED')
  const totalMessages = sessions.reduce((sum, s) => sum + (s._count?.messages ?? 0), 0)
  const avgDuration = endedSessions.length > 0
    ? Math.round(endedSessions.reduce((sum, s) => sum + (s.duration ?? 0), 0) / endedSessions.length / 60)
    : 0

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{user?.email}</span>
            <Link to="/admin" className="btn-secondary text-sm py-1.5 px-3">Admin</Link>
            <button onClick={logout} className="btn-secondary text-sm py-1.5 px-3">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" /></svg>}
            label="Total Sessions" value={sessions.length}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 12a3 3 0 116 0 3 3 0 01-6 0z" /></svg>}
            label="Active Now" value={activeSessions.length} color="text-green-400"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Avg Duration" value={avgDuration > 0 ? `${avgDuration}m` : '—'} color="text-blue-400"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            label="Total Messages" value={totalMessages} color="text-purple-400"
          />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <Link to="/sessions/new" className="btn-primary text-sm py-2 px-4">
            + New Session
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-900/50" />)}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {sessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-700 py-6">
        AtomQuest Hackathon 2026 · SupportVision
      </footer>
    </div>
  )
}
