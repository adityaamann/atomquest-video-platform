import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function MetricCard({ icon, label, value, unit = '', color = 'text-brand-500' }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}{unit}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

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

function ForceEndModal({ session, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 border border-red-800 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Force End Session?</h3>
            <p className="text-gray-400 text-sm mt-1">
              This will immediately disconnect all participants from the session with agent <span className="text-white">{session?.agent?.email}</span>.
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

export default function Admin() {
  const { user, logout } = useAuth()
  const [sessions, setSessions] = useState({ active: [], ended: [] })
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [confirmSession, setConfirmSession] = useState(null)
  const socketRef = useRef(null)

  async function fetchSessions() {
    try {
      const { data } = await api.get('/api/admin/sessions')
      setSessions(data)
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMetrics() {
    try {
      const { data } = await api.get('/api/metrics')
      setMetrics(data)
    } catch (err) {
      console.error('Metrics fetch error:', err)
    }
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

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex gap-3">
            <Link to="/dashboard" className="btn-secondary text-sm py-1.5 px-3">Agent View</Link>
            <button onClick={logout} className="btn-secondary text-sm py-1.5 px-3">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
          </div>
          <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-2">
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
              label="Active Sessions" value={metrics.activeSessions} color="text-green-400"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              label="Connected Now" value={metrics.connectedParticipants} color="text-blue-400"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              label="Sessions Today" value={metrics.totalSessionsToday} color="text-purple-400"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="Avg Duration" value={metrics.averageSessionDuration} unit="m" color="text-yellow-400"
            />
            <MetricCard
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              label="Error Rate" value={metrics.errorRate} unit="%" color={metrics.errorRate > 5 ? 'text-red-400' : 'text-gray-400'}
            />
          </div>
        )}

        {/* Live Sessions */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-lg font-semibold">Live Sessions <span className="text-gray-500 text-sm font-normal">({sessions.active.length})</span></h2>
          </div>

          {loading ? (
            <div className="card text-center py-8 text-gray-400">Loading...</div>
          ) : sessions.active.length === 0 ? (
            <div className="card text-center py-8 text-gray-500 text-sm">No active sessions right now</div>
          ) : (
            <div className="space-y-3">
              {sessions.active.map(s => (
                <div key={s.id} className="card border-green-900/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">{s.agent?.email}</span>
                        {customerOf(s) !== '—' && (
                          <span className="text-gray-500">↔</span>
                        )}
                        {customerOf(s) !== '—' && <span className="text-blue-400 truncate">{customerOf(s)}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="font-mono text-green-400">{liveDuration(s.startedAt, now)}</span>
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
        <div>
          <h2 className="text-lg font-semibold mb-4">Session History <span className="text-gray-500 text-sm font-normal">(last 50)</span></h2>
          {sessions.ended.length === 0 ? (
            <div className="card text-center py-8 text-gray-500 text-sm">No past sessions</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 bg-gray-900 border-b border-gray-800">
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Messages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sessions.ended.map(s => (
                    <tr key={s.id} className="text-gray-300 hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 truncate max-w-[160px]">{s.agent?.email}</td>
                      <td className="px-4 py-3 text-blue-300">{customerOf(s)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(s.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatDuration(s.duration)}</td>
                      <td className="px-4 py-3">{s._count?.messages ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-700 py-6">AtomQuest Hackathon 2026 · SupportVision</footer>

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
