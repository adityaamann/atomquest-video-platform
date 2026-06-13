import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { useMediaStream } from '../hooks/useMediaStream'
import { useWebRTC } from '../hooks/useWebRTC'
import { useSessionTimer } from '../hooks/useSessionTimer'
import VideoPlayer from '../components/VideoPlayer'
import ChatPanel from '../components/ChatPanel'
import CallControls from '../components/CallControls'
import Logo from '../components/Logo'
import api from '../lib/api'
import toast from 'react-hot-toast'

function useNetworkQuality(socketRef) {
  const [quality, setQuality] = useState(null)
  useEffect(() => {
    const check = () => {
      if (!socketRef.current?.connected) return
      const start = Date.now()
      socketRef.current.emit('ping-check')
      socketRef.current.once('pong-check', () => {
        const ping = Date.now() - start
        const bars = ping < 100 ? 3 : ping < 300 ? 2 : 1
        const color = ping < 100 ? 'bg-green-400' : ping < 300 ? 'bg-yellow-400' : 'bg-red-400'
        const label = ping < 100 ? 'Good' : ping < 300 ? 'Fair' : 'Poor'
        setQuality({ ping, bars, color, label })
        if (ping > 500) toast.error(`Poor connection (${ping}ms)`, { id: 'net-quality', duration: 4000 })
      })
    }
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [socketRef])
  return quality
}

export default function AgentCall() {
  const { id: sessionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { localStream, audioEnabled, videoEnabled, toggleAudio, toggleVideo, stopAll, error: mediaError } =
    useMediaStream()

  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [recordingStatus, setRecordingStatus] = useState(null)
  const [activeRecordingId, setActiveRecordingId] = useState(null)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [peerMediaStates, setPeerMediaStates] = useState({})
  const [typingPeer, setTypingPeer] = useState(null)
  const [chatVisible, setChatVisible] = useState(true)
  const [recordingBusy, setRecordingBusy] = useState(false)

  const socketRef = useRef(null)
  const pendingPeersRef = useRef([])
  const localMediaRef = useRef({ audioEnabled: true, videoEnabled: true })
  const mediaRecorderRef = useRef(null)
  const recordingChunksRef = useRef([])
  const typingTimerRef = useRef(null)

  const { remoteStreams, createPeer, handleSignal, cleanupPeer, cleanupAll } = useWebRTC({ localStream, socketRef })
  const timer = useSessionTimer()
  const networkQuality = useNetworkQuality(socketRef)

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'https://atomquest-video-platform-o9yz.onrender.com', { withCredentials: true })
    socketRef.current = socket

    socket.emit('join-session', { sessionId, name: user.email, role: 'AGENT', userId: user.id })

    socket.on('room-state', ({ participants: existing }) => {
      setParticipants(existing)
      existing.filter(p => p.role === 'CUSTOMER').forEach(p => {
        if (localStream) createPeer(p.socketId, true)
        else pendingPeersRef.current.push(p.socketId)
      })
    })

    socket.on('user-joined', ({ socketId, name, role }) => {
      setParticipants(prev => prev.find(p => p.socketId === socketId) ? prev : [...prev, { socketId, name, role }])
      if (role === 'CUSTOMER') {
        toast(`${name} joined the call`, { icon: '👋' })
        if (localStream) createPeer(socketId, true)
        else pendingPeersRef.current.push(socketId)
      }
    })

    socket.on('signal', data => handleSignal(data))

    socket.on('peer-media-state', ({ socketId, audioEnabled, videoEnabled }) => {
      setPeerMediaStates(prev => ({ ...prev, [socketId]: { audioEnabled, videoEnabled } }))
    })

    socket.on('peer-typing', ({ name, typing }) => {
      clearTimeout(typingTimerRef.current)
      setTypingPeer(typing ? name : null)
      if (typing) typingTimerRef.current = setTimeout(() => setTypingPeer(null), 4000)
    })

    socket.on('user-left', ({ socketId, name }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId))
      setPeerMediaStates(prev => { const n = { ...prev }; delete n[socketId]; return n })
      cleanupPeer(socketId)
      toast(`${name || 'Participant'} left the call`)
    })

    socket.on('receive-message', msg => setMessages(prev => [...prev, msg]))

    socket.on('recording-started', ({ recordingId }) => {
      setRecordingStatus('IN_PROGRESS')
      setActiveRecordingId(recordingId)
    })
    socket.on('recording-stopped', () => setRecordingStatus('PROCESSING'))

    socket.on('session-ended', () => {
      setSessionEnded(true)
      stopAll()
      cleanupAll()
      setTimeout(() => navigate('/dashboard'), 3000)
    })

    socket.on('error', ({ message }) => toast.error(message))

    const handleBeforeUnload = () => socket.disconnect()
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearTimeout(typingTimerRef.current)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      socket.disconnect()
      stopAll()
      cleanupAll()
    }
  }, [sessionId])

  useEffect(() => {
    if (!localStream) return
    const pending = [...pendingPeersRef.current]
    pendingPeersRef.current = []
    pending.forEach(socketId => createPeer(socketId, true))
  }, [localStream])

  const handleToggleAudio = useCallback(() => {
    toggleAudio()
    const next = !localMediaRef.current.audioEnabled
    localMediaRef.current.audioEnabled = next
    socketRef.current?.emit('media-state-change', { sessionId, audioEnabled: next, videoEnabled: localMediaRef.current.videoEnabled })
  }, [toggleAudio, sessionId])

  const handleToggleVideo = useCallback(() => {
    toggleVideo()
    const next = !localMediaRef.current.videoEnabled
    localMediaRef.current.videoEnabled = next
    socketRef.current?.emit('media-state-change', { sessionId, audioEnabled: localMediaRef.current.audioEnabled, videoEnabled: next })
  }, [toggleVideo, sessionId])

  async function startRecording() {
    if (recordingBusy || recordingStatus === 'IN_PROGRESS') return
    if (!localStream) return toast.error('No local stream available')
    setRecordingBusy(true)
    try {
      const { data } = await api.post(`/api/sessions/${sessionId}/recording/start`)
      setActiveRecordingId(data.recordingId)
      setRecordingStatus('IN_PROGRESS')
      socketRef.current?.emit('recording-start-ack', { sessionId, recordingId: data.recordingId })
      toast.success('Recording started')
      recordingChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm'
      const mr = new MediaRecorder(localStream, { mimeType })
      mr.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data) }
      mr.start(1000)
      mediaRecorderRef.current = mr
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start recording')
    } finally {
      setRecordingBusy(false)
    }
  }

  async function stopRecording() {
    if (recordingBusy || recordingStatus !== 'IN_PROGRESS') return
    setRecordingBusy(true)
    const recId = activeRecordingId
    try {
      await new Promise(resolve => {
        const mr = mediaRecorderRef.current
        if (!mr || mr.state === 'inactive') return resolve()
        mr.onstop = resolve
        mr.stop()
      })
      mediaRecorderRef.current = null
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' })
      recordingChunksRef.current = []
      await api.post(`/api/sessions/${sessionId}/recording/stop`, { recordingId: recId })
      socketRef.current?.emit('recording-stop-ack', { sessionId, recordingId: recId })
      setRecordingStatus('PROCESSING')
      const formData = new FormData()
      formData.append('recording', blob, `${recId}.webm`)
      try {
        await api.post(`/api/sessions/${sessionId}/recording/${recId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setRecordingStatus('READY')
        toast.success('Recording saved!')
      } catch {
        toast.error('Recording save failed — the call was recorded but could not be uploaded.')
        setRecordingStatus(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to stop recording')
    } finally {
      setRecordingBusy(false)
    }
  }

  async function endSession() {
    if (!confirm('End this session for all participants?')) return
    socketRef.current?.emit('end-session', { sessionId })
    try { await api.post(`/api/sessions/${sessionId}/end`) } catch {}
    stopAll()
    cleanupAll()
    navigate('/dashboard')
  }

  function sendMessage(content, fileUrl, fileType) {
    socketRef.current?.emit('send-message', { sessionId, content, fileUrl, fileType })
  }

  if (mediaError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Media Error</h2>
          <p className="text-slate-600 text-sm">{mediaError}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">Reload & Try Again</button>
        </div>
      </div>
    )
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Session Ended</h2>
          <p className="text-slate-500">Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  const remoteParticipants = participants.filter(p => p.role === 'CUSTOMER')
  const mainParticipant = remoteParticipants[0]

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-700">Live Session</span>
            <span className="text-xs text-slate-400 font-mono hidden sm:block">{sessionId.slice(0,8)}…</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recordingStatus === 'IN_PROGRESS' && (
            <span className="flex items-center gap-1.5 text-red-600 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
          <span className="text-xs text-slate-500 hidden sm:block">{participants.length + 1} in call</span>
          <button onClick={() => setChatVisible(v => !v)}
            className="text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-lg transition-colors">
            {chatVisible ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: main video */}
        <div className="relative bg-slate-900 overflow-hidden flex-1">
          <div className="absolute inset-0">
            {mainParticipant ? (
              <VideoPlayer
                stream={remoteStreams[mainParticipant.socketId] || null}
                label={mainParticipant.name}
                className="w-full h-full"
                audioEnabled={peerMediaStates[mainParticipant.socketId]?.audioEnabled ?? true}
                videoEnabled={peerMediaStates[mainParticipant.socketId]?.videoEnabled ?? true}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                  <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Waiting for customer to join…</p>
                <p className="text-slate-500 text-xs">Share the invite link from the dashboard</p>
              </div>
            )}
          </div>

          {/* WebRTC badge */}
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 text-xs text-slate-300 flex items-center gap-1.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            WebRTC
          </div>

          {/* PiP (own video) — shown here when chat is hidden */}
          {!chatVisible && (
            <div className="absolute bottom-20 right-4 w-44 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10">
              <VideoPlayer stream={localStream} muted label="You" className="w-full h-full" />
            </div>
          )}

          {/* Floating controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <CallControls
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onEndCall={endSession}
              isAgent={true}
              recordingStatus={recordingStatus}
              recordingBusy={recordingBusy}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              networkQuality={networkQuality}
              timer={timer}
            />
          </div>
        </div>

        {/* Right: self video (top) + chat (bottom) */}
        {chatVisible && (
          <div className="w-80 flex flex-col border-l border-slate-200 shrink-0 bg-white">
            <div className="h-44 bg-slate-900 border-b border-slate-700 shrink-0 overflow-hidden">
              <VideoPlayer stream={localStream} muted label="You (Agent)" className="w-full h-full" />
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <ChatPanel
                messages={messages}
                onSend={sendMessage}
                currentUser={user.email}
                socketRef={socketRef}
                sessionId={sessionId}
                typingPeer={typingPeer}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
