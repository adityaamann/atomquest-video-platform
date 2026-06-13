import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'

const PRIORITY_CLASS = {
  LOW: 'priority-low', MEDIUM: 'priority-medium', HIGH: 'priority-high', URGENT: 'priority-urgent',
}

function greeting(name) {
  const h = new Date().getHours()
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${g}, ${name?.split(' ')[0] || 'Agent'} 👋`
}

function formatDur(s) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m`
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

function StatCard({ icon, label, value, color = 'text-primary-600', bg = 'bg-primary-50' }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center ${color} shrink-0`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  )
}

function SessionCard({ session, onCopyInvite }) {
  const navigate = useNavigate()
  const inviteUrl = `${window.location.origin}/join/${session.inviteToken}`
  const isActive = session.status === 'ACTIVE'

  return (
    <div className="card-hover p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{session.title || 'Support Session'}</h3>
          <p className="text-sm text-slate-500 mt-0.5 truncate">
            {session.customerName || '—'}
            {session.customerEmail ? <span className="text-slate-400"> · {session.customerEmail}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={PRIORITY_CLASS[session.priority] || 'priority-medium'}>{session.priority || 'MEDIUM'}</span>
          {isActive
            ? <span className="badge-active"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />Live</span>
            : <span className="badge-ended">Ended</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
        <span>{formatDate(session.startedAt)}</span>
        {session.duration ? <span className="font-medium">{formatDur(session.duration)}</span> : null}
        {session._count?.messages > 0 ? <span>{session._count.messages} msgs</span> : null}
        {session.category ? <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{session.category}</span> : null}
      </div>

      <div className="flex gap-2 flex-wrap">
        {isActive ? (
          <button onClick={() => navigate(`/sessions/${session.id}/call`)} className="btn-primary text-xs py-1.5 px-3">
            Join Call
          </button>
        ) : (
          <Link to={`/sessions/${session.id}/history`} className="btn-secondary text-xs py-1.5 px-3">
            View Details
          </Link>
        )}
        <button onClick={() => onCopyInvite(inviteUrl)} className="btn-ghost text-xs py-1.5 px-3">
          Copy Invite
        </button>
      </div>
    </div>
  )
}

const FILTERS = ['All', 'Active', 'Ended']

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    api.get('/api/sessions')
      .then(({ data }) => setSessions(data))
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false))
  }, [])

  function copyInvite(url) {
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Invite link copied!'))
      .catch(() => toast.error('Copy failed'))
  }

  const filtered = sessions.filter(s =>
    filter === 'Active' ? s.status === 'ACTIVE'
    : filter === 'Ended' ? s.status === 'ENDED'
    : true
  )

  const activeCount = sessions.filter(s => s.status === 'ACTIVE').length
  const ended = sessions.filter(s => s.status === 'ENDED')
  const avgDur = ended.length ? Math.floor(ended.reduce((a, s) => a + (s.duration || 0), 0) / ended.length) : null
  const thisWeek = sessions.filter(s => Date.now() - new Date(s.startedAt) < 7 * 86400000).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{greeting(user?.name)}</h1>
            <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
          </div>
          <button onClick={() => navigate('/sessions/new')} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            label="Total Sessions" value={sessions.length}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 12a3 3 0 116 0 3 3 0 01-6 0z" /></svg>}
            label="Active Now" value={activeCount} color="text-green-600" bg="bg-green-50"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Avg Duration" value={avgDur ? formatDur(avgDur) : '—'} color="text-purple-600" bg="bg-purple-50"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label="This Week" value={thisWeek} color="text-accent-500" bg="bg-orange-50"
          />
        </div>

        {/* Sessions */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Sessions</h2>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-28 w-full rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">
                  {filter === 'All' ? 'No sessions yet' : `No ${filter.toLowerCase()} sessions`}
                </p>
                <p className="text-slate-400 text-sm mt-1 mb-5">
                  {filter === 'All' ? 'Create your first session to get started' : 'Try a different filter'}
                </p>
                {filter === 'All' && (
                  <button onClick={() => navigate('/sessions/new')} className="btn-primary">
                    Create First Session
                  </button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {filtered.map(s => <SessionCard key={s.id} session={s} onCopyInvite={copyInvite} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
