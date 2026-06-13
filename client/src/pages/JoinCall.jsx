import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

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
      .catch((err) => setError(err.response?.data?.error || 'Invalid invite link'))
      .finally(() => setValidating(false))

    // Start camera preview
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        previewStreamRef.current = stream
        if (previewRef.current) previewRef.current.srcObject = stream
        setCameraReady(true)
      })
      .catch(() => setCameraError('Camera/mic permission denied. You can still join but others won\'t see you.'))

    return () => {
      previewStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [token])

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return
    setJoining(true)
    // Stop preview — the actual call will start its own stream
    previewStreamRef.current?.getTracks().forEach(t => t.stop())
    sessionStorage.setItem('customerName', name.trim())
    sessionStorage.setItem('inviteToken', token)
    navigate(`/call/${sessionInfo.sessionId}`)
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Validating invite link...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Invalid Invite Link</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl relative">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera preview */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Camera Preview</h3>
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video border border-gray-800">
              {cameraReady ? (
                <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {cameraError ? (
                    <div className="text-center px-4">
                      <svg className="w-10 h-10 text-yellow-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728" />
                      </svg>
                      <p className="text-yellow-400 text-xs">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-10 h-10 text-gray-600 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
                      </svg>
                      <p className="text-gray-500 text-xs">Requesting camera access...</p>
                    </div>
                  )}
                </div>
              )}
              {cameraReady && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-green-900/60 border border-green-700 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-300 font-medium">Camera ready</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600">Your camera and microphone will be used for the support call. The agent may record this session.</p>
          </div>

          {/* Join form */}
          <div className="card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">Session is live</span>
              </div>
              <h2 className="text-xl font-bold mb-1">Join Support Session</h2>
              <p className="text-gray-400 text-sm mb-6">
                You're connecting with{' '}
                <span className="text-white font-medium">{sessionInfo?.agentEmail}</span>
              </p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                    autoFocus
                  />
                </div>

                <p className="text-xs text-gray-500">
                  By joining, you consent to this call being recorded by the support agent.
                </p>

                <button
                  type="submit"
                  disabled={!name.trim() || joining}
                  className="btn-primary w-full py-3 text-base font-semibold"
                >
                  {joining ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Joining...
                    </span>
                  ) : (
                    'Join Now →'
                  )}
                </button>
              </form>
            </div>

            <p className="text-xs text-gray-700 mt-4 text-center">
              Powered by WebRTC · SupportVision
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
