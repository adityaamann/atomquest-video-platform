import { useState, useEffect, useRef } from 'react'
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
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', { withCredentials: true })
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

    socket.on('user-left', ({ socketId, name }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId))
      setPeerMediaStates(prev => { const n = { ...prev }; delete n[socketId]; return n })
      cleanupPeer(socketId)
    })

    socket.on('receive-message', msg => setMessages(prev => [...prev, msg]))
    socket.on('recording-started', () => {
      setRecordingActive(true)
      toast('Session recording started', { icon: '🔴' })
    })
    socket.on('recording-stopped', () => setRecordingActive(false))

    socket.on('session-ended', () => {
      setSessionEnded(true)
      stopAll()
      cleanupAll()
      socket.disconnect()
    })

    const handleBeforeUnload = () => socket.disconnect()
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      socket.disconnect()
      stopAll()
      cleanupAll()
    }
  }, [sessionId])

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
          <Logo size="md" className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Call Ended</h2>
          <p className="text-gray-400">The support session has ended. Thank you!</p>
          <p className="text-xs text-gray-600 mt-4">Duration: {timer.display}</p>
        </div>
      </div>
    )
  }

  const agentParticipants = participants.filter(p => p.role === 'AGENT')
  const mainAgent = agentParticipants[0]

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-300">Support Call</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {recordingActive && (
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              REC
            </span>
          )}
          <span className="hidden sm:block">{customerName}</span>
          <button onClick={() => setChatVisible(v => !v)} className="btn-secondary text-xs py-1 px-2">
            {chatVisible ? 'Hide Chat' : 'Chat'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-gray-950 overflow-hidden">
          {/* Main video — agent */}
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
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Waiting for agent…</p>
              </div>
            )}
          </div>

          {/* PiP — customer's own video */}
          <div className="absolute bottom-20 left-4 w-44 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10">
            <VideoPlayer stream={localStream} muted label={customerName} className="w-full h-full" />
          </div>

          {/* Floating controls */}
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

        {chatVisible && (
          <div className="w-80 p-3 shrink-0 border-l border-gray-800">
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              currentUser={customerName}
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
