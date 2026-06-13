import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function liveDuration(startedAt, now) {
  const seconds = Math.floor((now - new Date(startedAt)) / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function MetricCard({ icon, label, value, unit = '', color = 'text-primary-600', bg = 'bg-primary-50' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center ${color} shrink-0`}>{icon}</div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}{unit}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  )
}

function ForceEndModal({ session, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full shadow-modal">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Force End Session?</h3>
            <p className="text-slate-500 text-sm mt-1">
              This will immediately disconnect all participants from the session with agent{' '}
              <span className="text-slate-900 font-medium">{session?.agent?.email}</span>.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm px-4">Cancel</button>
          <button onClick={onConfirm} className="btn-danger text-sm px-4">Force End</button>
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 10

export default function Admin() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState({ active: [], ended: [] })
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [confirmSession, setConfirmSession] = useState(null)
  const [page, setPage] = useState(1)
  const [dateFilter, setDateFilter] = useState('')
  const socketRef = useRef(null)

  async function fetchSessions() {
    try {
      const { data } = await api.get('/api/admin/sessions')
      setSessions(data)
    } catch {}
    finally { setLoading(false) }
  }

  async function fetchMetrics() {
    try {
      const { data } = await api.get('/api/metrics')
      setMetrics(data)
    } catch {}
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchSessions()
    fetchMetrics()
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', { withCredentials: true })
    socketRef.current = socket
    socket.emit('join-admin')
    socket.on('admin-update', () => fetchSessions())
    socket.on('metrics-update', data => setMetrics(data))
    return () => socket.disconnect()
  }, [])

  async function forceEnd(sessionId) {
    try {
      await api.post(`/api/admin/sessions/${sessionId}/force-end`)
      setConfirmSession(null)
      fetchSessions()
      toast.success('Session force ended')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to force end session')
    }
  }

  function exportCSV() {
    api.get('/api/admin/sessions/export', { responseType: 'blob' })
      .then(({ data }) => {
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = 'sessions-export.csv'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV exported!')
      })
      .catch(() => toast.error('Export failed'))
  }

  const customerOf = s => s.participants?.find(p => p.role === 'CUSTOMER')?.name || '—'

  const filteredEnded = sessions.ended.filter(s => {
    if (!dateFilter) return true
    const d = new Date(s.startedAt).toISOString().split('T')[0]
    return d === dateFilter
  })
  const totalPages = Math.max(1, Math.ceil(filteredEnded.length / PAGE_SIZE))
  const pagedEnded = filteredEnded.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
          </div>
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 12a3 3 0 116 0 3 3 0 01-6 0z" /></svg>}
              label="Active Now" value={metrics.activeSessions} color="text-green-600" bg="bg-green-50"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              label="Connected" value={metrics.connectedParticipants} color="text-primary-600" bg="bg-primary-50"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              label="Sessions Today" value={metrics.totalSessionsToday} color="text-purple-600" bg="bg-purple-50"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="Avg Duration" value={metrics.averageSessionDuration} unit="m" color="text-accent-500" bg="bg-orange-50"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              label="Error Rate" value={metrics.errorRate} unit="%"
              color={metrics.errorRate > 5 ? 'text-red-600' : 'text-slate-600'}
              bg={metrics.errorRate > 5 ? 'bg-red-50' : 'bg-slate-100'}
            />
          </div>
        )}

        {/* Live Sessions */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-slate-900">
              Live Sessions
              <span className="text-slate-400 text-sm font-normal ml-2">({sessions.active.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="skeleton h-20 rounded-xl" />
          ) : sessions.active.length === 0 ? (
            <div className="card text-center py-8 text-slate-500 text-sm">No active sessions right now</div>
          ) : (
            <div className="space-y-3">
              {sessions.active.map(s => (
                <div key={s.id} className="card border-green-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-900 truncate">{s.agent?.email}</span>
                        {customerOf(s) !== '—' && <span className="text-slate-400">↔</span>}
                        {customerOf(s) !== '—' && <span className="text-primary-600 truncate">{customerOf(s)}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-green-600">{liveDuration(s.startedAt, now)}</span>
                        <span>{s._count?.messages ?? 0} messages</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setConfirmSession(s)} className="btn-danger text-xs py-1.5 px-3 shrink-0">
                    Force End
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">
              Session History
              <span className="text-slate-400 text-sm font-normal ml-2">({filteredEnded.length})</span>
            </h2>
            <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }}
              className="input-field w-auto text-sm py-1.5" />
          </div>

          {filteredEnded.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              {dateFilter ? 'No sessions on this date' : 'No past sessions'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Started</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Messages</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedEnded.map(s => (
                      <tr key={s.id} className="text-slate-700 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 truncate max-w-[160px]">{s.agent?.email}</td>
                        <td className="px-6 py-3 text-primary-600">{customerOf(s)}</td>
                        <td className="px-6 py-3 text-xs text-slate-500">{new Date(s.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                        <td className="px-6 py-3 font-mono text-xs">{formatDuration(s.duration)}</td>
                        <td className="px-6 py-3">{s._count?.messages ?? 0}</td>
                        <td className="px-6 py-3">
                          <Link to={`/sessions/${s.id}/history`} className="text-xs text-primary-600 hover:underline">
                            Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredEnded.length)} of {filteredEnded.length}
                  </p>
                  <div className="flex gap-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40">
                      ←
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          p === page ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 hover:bg-slate-50'
                        }`}>
                        {p}
                      </button>
                    ))}
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40">
                      →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {confirmSession && (
        <ForceEndModal
          session={confirmSession}
          onConfirm={() => forceEnd(confirmSession.id)}
          onCancel={() => setConfirmSession(null)}
        />
      )}
    </div>
  )
}
