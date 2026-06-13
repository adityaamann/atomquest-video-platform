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
      if (!socketRef.current) return
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
  }, [])

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
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', { withCredentials: true })
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

    socket.on('signal', (data) => handleSignal(data))

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

  function handleToggleAudio() {
    toggleAudio()
    const next = !localMediaRef.current.audioEnabled
    localMediaRef.current.audioEnabled = next
    socketRef.current?.emit('media-state-change', { sessionId, audioEnabled: next, videoEnabled: localMediaRef.current.videoEnabled })
  }

  function handleToggleVideo() {
    toggleVideo()
    const next = !localMediaRef.current.videoEnabled
    localMediaRef.current.videoEnabled = next
    socketRef.current?.emit('media-state-change', { sessionId, audioEnabled: localMediaRef.current.audioEnabled, videoEnabled: next })
  }

  async function startRecording() {
    if (!localStream) return toast.error('No local stream available')
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
    }
  }

  async function stopRecording() {
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
      toast.promise(
        api.post(`/api/sessions/${sessionId}/recording/${recId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
        { loading: 'Saving recording...', success: 'Recording saved!', error: 'Recording save failed' }
      )
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to stop recording')
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Camera/Microphone Error</h2>
          <p className="text-gray-400 text-sm">{mediaError}</p>
          <p className="text-gray-500 text-xs mt-2">Allow camera/mic access and reload.</p>
        </div>
      </div>
    )
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Session Ended</h2>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  const remoteParticipants = participants.filter(p => p.role === 'CUSTOMER')
  const mainParticipant = remoteParticipants[0]

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-300">Live Session</span>
            <span className="text-xs text-gray-600 font-mono hidden sm:block">{sessionId.slice(0,8)}…</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {recordingStatus === 'IN_PROGRESS' && (
            <span className="flex items-center gap-1.5 text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
          <span className="hidden sm:block">{participants.length + 1} in call</span>
          <button onClick={() => setChatVisible(v => !v)} className="btn-secondary text-xs py-1 px-2">
            {chatVisible ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative bg-gray-950 overflow-hidden">
          {/* Main video — customer or placeholder */}
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
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Waiting for customer to join…</p>
                <p className="text-gray-600 text-xs">Share the invite link from the dashboard</p>
              </div>
            )}
          </div>

          {/* PiP — agent's own video */}
          <div className="absolute bottom-20 left-4 w-44 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10">
            <VideoPlayer stream={localStream} muted label="You" className="w-full h-full" />
          </div>

          {/* WebRTC badge */}
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 text-xs text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            Powered by WebRTC
          </div>

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
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              networkQuality={networkQuality}
              timer={timer}
            />
          </div>
        </div>

        {/* Chat panel */}
        {chatVisible && (
          <div className="w-80 p-3 shrink-0 border-l border-gray-800">
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              currentUser={user.email}
              socketRef={socketRef}
              sessionId={sessionId}
              typingPeer={typingPeer}
            />
          </div>
        )}
      </div>
    </div>
  )
}
