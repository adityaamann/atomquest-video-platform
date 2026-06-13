import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import Logo from '../components/Logo'

export default function JoinCall() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [sessionInfo, setSessionInfo] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(true)
  const [joining, setJoining] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const previewRef = useRef(null)
  const previewStreamRef = useRef(null)

  useEffect(() => {
    api.get(`/api/join/${token}`)
      .then(({ data }) => setSessionInfo(data))
      .catch(err => setError(err.response?.data?.error || 'Invalid invite link'))
      .finally(() => setValidating(false))

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        previewStreamRef.current = stream
        if (previewRef.current) previewRef.current.srcObject = stream
        setCameraReady(true)
      })
      .catch(() => setCameraError("Camera/mic permission denied. You can still join but others won't see you."))

    return () => {
      previewStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [token])

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    previewStreamRef.current?.getTracks().forEach(t => t.stop())
    sessionStorage.setItem('customerName', name.trim())
    sessionStorage.setItem('inviteToken', token)
    navigate(`/call/${sessionInfo.sessionId}`)
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-8 h-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-500 text-sm">Validating invite link…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Invalid Invite Link</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 page-enter">
      <div className="w-full max-w-4xl">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera preview */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Camera Preview</p>
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video border border-slate-200 shadow-sm">
              {cameraReady ? (
                <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {cameraError ? (
                    <div className="text-center px-4">
                      <svg className="w-10 h-10 text-yellow-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728" />
                      </svg>
                      <p className="text-yellow-300 text-xs">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-10 h-10 text-slate-500 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
                      </svg>
                      <p className="text-slate-500 text-xs">Requesting camera access…</p>
                    </div>
                  )}
                </div>
              )}

              {/* Device status badges */}
              <div className="absolute bottom-3 left-3 flex gap-2">
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  cameraReady ? 'bg-green-900/70 border-green-700 text-green-300' : 'bg-slate-800/70 border-slate-600 text-slate-400'
                }`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                  {cameraReady ? 'Camera OK' : 'No Camera'}
                </span>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  cameraReady ? 'bg-green-900/70 border-green-700 text-green-300' : 'bg-slate-800/70 border-slate-600 text-slate-400'
                }`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                  </svg>
                  {cameraReady ? 'Mic OK' : 'No Mic'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your camera and microphone will be used for the support call. The agent may record this session.
            </p>
          </div>

          {/* Join form */}
          <div className="card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-600 text-xs font-semibold">Session is live</span>
              </div>

              {sessionInfo?.title && (
                <h2 className="text-xl font-bold text-slate-900 mb-1">{sessionInfo.title}</h2>
              )}
              <p className="text-slate-500 text-sm mb-6">
                Hosted by{' '}
                <span className="text-slate-700 font-medium">{sessionInfo?.agentName || sessionInfo?.agentEmail}</span>
              </p>

              <form onSubmit={handleJoin} className="space-y-4" noValidate>
                <div>
                  <label className="form-label">Your Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    required placeholder="Enter your full name" autoFocus
                    className="input-field" />
                </div>

                <p className="text-xs text-slate-400">
                  By joining, you consent to this call being recorded by the support agent.
                </p>

                <button type="submit" disabled={!name.trim() || joining}
                  className="btn-primary w-full py-3 text-base font-semibold">
                  {joining ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Joining…
                    </>
                  ) : 'Join Now →'}
                </button>
              </form>
            </div>

            <p className="text-xs text-slate-400 mt-6 text-center">
              Powered by WebRTC · SupportVision
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
