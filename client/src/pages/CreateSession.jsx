import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../lib/api'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

export default function CreateSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const navigate = useNavigate()

  async function createSession() {
    if (loading) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/sessions')
      setSession(data)
      toast.success('Session created!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const inviteUrl = session ? `${window.location.origin}/join/${session.inviteToken}` : ''

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => toast.success('Link copied!'))
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(`Hi! Join my support session on SupportVision: ${inviteUrl}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">New Support Session</h1>
        <p className="text-gray-500 text-sm mb-8">Create a session and share the invite link with your customer.</p>

        {!session && (
          <div className="card text-center py-14">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1">Ready to start?</h2>
            <p className="text-gray-500 text-sm mb-6">A unique invite link will be generated for this session.</p>
            <button onClick={createSession} disabled={loading} className="btn-primary px-8 py-3 text-base font-semibold">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : 'Create Session'}
            </button>
          </div>
        )}

        {session && (
          <div className="space-y-5">
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-sm font-medium">Session Active</span>
              </div>
              <h2 className="text-lg font-semibold mb-4">Share this invite link</h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text" readOnly value={inviteUrl}
                  className="input-field text-sm font-mono"
                  onFocus={e => e.target.select()}
                />
                <button onClick={copyLink} className="btn-secondary shrink-0 px-4">Copy</button>
              </div>

              <div className="flex gap-2">
                <button onClick={shareWhatsApp}
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Share via WhatsApp
                </button>
                <button onClick={() => setShowQR(v => !v)}
                  className="flex items-center gap-2 btn-secondary text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Code
                </button>
              </div>

              {showQR && (
                <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
                  <QRCodeSVG value={inviteUrl} size={160} level="M" />
                  <p className="text-gray-600 text-xs">Scan to join the session</p>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-medium mb-3 text-sm text-gray-400 uppercase tracking-wide">Session Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Session ID</span>
                  <span className="font-mono text-xs text-gray-300">{session.id.slice(0, 16)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{new Date(session.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Agent</span>
                  <span>{session.agent?.email}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to={`/sessions/${session.id}/call`} className="btn-primary flex-1 text-center py-3 font-semibold">
                Join as Agent →
              </Link>
              <Link to="/dashboard" className="btn-secondary flex-1 text-center py-3">
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
