import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useMediaStream } from '../hooks/useMediaStream'
import { useWebRTC } from '../hooks/useWebRTC'
import { useSessionTimer } from '../hooks/useSessionTimer'
import VideoPlayer from '../components/VideoPlayer'
import ChatPanel from '../components/ChatPanel'
import CallControls from '../components/CallControls'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

export default function CustomerCall() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const customerName = sessionStorage.getItem('customerName')
  useEffect(() => {
    if (!customerName) {
      const token = sessionStorage.getItem('inviteToken')
      navigate(token ? `/join/${token}` : '/', { replace: true })
    }
  }, [])

  const { localStream, audioEnabled, videoEnabled, toggleAudio, toggleVideo, stopAll, error: mediaError } =
    useMediaStream()

  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [sessionEnded, setSessionEnded] = useState(false)
  const [recordingActive, setRecordingActive] = useState(false)
  const [peerMediaStates, setPeerMediaStates] = useState({})
  const [typingPeer, setTypingPeer] = useState(null)
  const [chatVisible, setChatVisible] = useState(true)

  const socketRef = useRef(null)
  const localMediaRef = useRef({ audioEnabled: true, videoEnabled: true })
  const typingTimerRef = useRef(null)

  const { remoteStreams, handleSignal, cleanupPeer, cleanupAll } = useWebRTC({ localStream, socketRef })
  const timer = useSessionTimer()

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'https://atomquest-video-platform-o9yz.onrender.com', { withCredentials: true })
    socketRef.current = socket

    socket.emit('join-session', { sessionId, name: customerName, role: 'CUSTOMER', userId: null })

    socket.on('room-state', ({ participants: existing }) => setParticipants(existing))

    socket.on('user-joined', ({ socketId, name, role }) => {
      setParticipants(prev => prev.find(p => p.socketId === socketId) ? prev : [...prev, { socketId, name, role }])
      if (role === 'AGENT') toast(`${name} (Agent) joined`)
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

    socket.on('user-left', ({ socketId }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId))
      setPeerMediaStates(prev => { const n = { ...prev }; delete n[socketId]; return n })
      cleanupPeer(socketId)
    })

    socket.on('receive-message', msg => setMessages(prev => [...prev, msg]))
    socket.on('recording-started', () => {
      setRecordingActive(true)
      toast('Session is being recorded', { icon: '🔴' })
    })
    socket.on('recording-stopped', () => setRecordingActive(false))

    socket.on('session-ended', () => {
      setSessionEnded(true)
      stopAll()
      cleanupAll()
      socket.disconnect()
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center page-enter">
        <div className="card max-w-md text-center">
          <div className="flex justify-center mb-4"><Logo size="md" /></div>
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Call Ended</h2>
          <p className="text-slate-500 text-sm">The support session has ended. Thank you!</p>
          <p className="text-xs text-slate-400 mt-3">Duration: {timer.display}</p>
        </div>
      </div>
    )
  }

  const agentParticipants = participants.filter(p => p.role === 'AGENT')
  const mainAgent = agentParticipants[0]

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-700">Support Call</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recordingActive && (
            <span className="flex items-center gap-1.5 text-red-600 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium hidden sm:block">{customerName}</span>
          <button onClick={() => setChatVisible(v => !v)}
            className="text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-lg transition-colors">
            {chatVisible ? 'Hide Chat' : 'Chat'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: main video */}
        <div className="relative bg-slate-900 overflow-hidden flex-1">
          <div className="absolute inset-0">
            {mainAgent ? (
              <VideoPlayer
                stream={remoteStreams[mainAgent.socketId] || null}
                label={`${mainAgent.name} (Agent)`}
                className="w-full h-full"
                audioEnabled={peerMediaStates[mainAgent.socketId]?.audioEnabled ?? true}
                videoEnabled={peerMediaStates[mainAgent.socketId]?.videoEnabled ?? true}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Waiting for agent…</p>
              </div>
            )}
          </div>

          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 text-xs text-slate-300 flex items-center gap-1.5 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            WebRTC
          </div>

          {!chatVisible && (
            <div className="absolute bottom-20 right-4 w-44 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10">
              <VideoPlayer stream={localStream} muted label={customerName} className="w-full h-full" />
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <CallControls
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              isAgent={false}
              timer={timer}
            />
          </div>
        </div>

        {/* Right: self video + chat */}
        {chatVisible && (
          <div className="w-80 flex flex-col border-l border-slate-200 shrink-0 bg-white">
            <div className="h-44 bg-slate-900 border-b border-slate-700 shrink-0 overflow-hidden">
              <VideoPlayer stream={localStream} muted label={customerName} className="w-full h-full" />
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <ChatPanel
                messages={messages}
                onSend={sendMessage}
                currentUser={customerName}
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
