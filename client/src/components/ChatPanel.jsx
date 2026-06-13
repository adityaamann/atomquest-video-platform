import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])

function FileMessage({ msg, isMe }) {
  const isImage = msg.fileType?.startsWith('image/')
  const url = msg.fileUrl?.startsWith('http') ? msg.fileUrl : `${API_BASE}${msg.fileUrl}`

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={msg.content || 'image'}
          className="max-w-full max-h-48 rounded-lg mt-1 border border-slate-200"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling?.classList.remove('hidden')
          }}
        />
        <span className="hidden text-xs text-slate-400 mt-1 italic">[Image unavailable]</span>
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2 text-xs mt-1 px-3 py-2 rounded-lg border ${
        isMe ? 'bg-primary-500 border-primary-400 text-white' : 'bg-white border-slate-200 text-slate-700'
      }`}>
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate max-w-[120px]">{msg.content || 'Download file'}</span>
    </a>
  )
}

function TypingBubble({ name }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-slate-400 mb-1 px-1">{name} is typing</span>
      <div className="bg-slate-100 border border-slate-200 rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function ChatPanel({ messages, onSend, currentUser, socketRef, sessionId, typingPeer }) {
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showNewMsg, setShowNewMsg] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimerRef = useRef(null)
  const isTypingRef = useRef(false)
  const isAtBottomRef = useRef(true)

  function checkAtBottom() {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShowNewMsg(false)
    } else {
      setShowNewMsg(true)
    }
  }, [messages, typingPeer])

  function handleScroll() {
    const atBottom = checkAtBottom()
    isAtBottomRef.current = atBottom
    if (atBottom) setShowNewMsg(false)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    isAtBottomRef.current = true
    setShowNewMsg(false)
  }

  function emitTypingStop() {
    if (isTypingRef.current && socketRef?.current && sessionId) {
      socketRef.current.emit('typing-stop', { sessionId })
      isTypingRef.current = false
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value)
    if (!socketRef?.current || !sessionId) return
    if (!isTypingRef.current) {
      socketRef.current.emit('typing-start', { sessionId })
      isTypingRef.current = true
    }
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(emitTypingStop, 3000)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    emitTypingStop()
    clearTimeout(typingTimerRef.current)
    onSend(trimmed)
    setInput('')
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Client-side validation
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File size exceeds 10MB limit.')
      return
    }
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('File type not supported. Use jpg, png, gif, pdf, doc or docx.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
        },
      })
      onSend(file.name, data.fileUrl, data.fileType)
    } catch (err) {
      toast.error(err.response?.data?.error || 'File upload failed. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="font-semibold text-sm text-slate-700">Session Chat</span>
        {messages.length > 0 && (
          <span className="ml-auto bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {messages.length}
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 relative"
      >
        {messages.length === 0 && (
          <p className="text-slate-400 text-xs text-center mt-8">Messages will appear here</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderName === currentUser
          return (
            <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-slate-400 mb-1 px-1">{isMe ? 'You' : msg.senderName}</span>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                isMe
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'
              }`}>
                {msg.fileUrl ? <FileMessage msg={msg} isMe={isMe} /> : msg.content}
              </div>
              <span className="text-xs text-slate-400 mt-1 px-1">
                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        {typingPeer && <TypingBubble name={typingPeer} />}
        <div ref={messagesEndRef} />
      </div>

      {/* New message button */}
      {showNewMsg && (
        <button
          onClick={scrollToBottom}
          className="mx-3 mb-1 bg-primary-600 text-white text-xs font-medium py-1.5 px-4 rounded-full flex items-center gap-1 justify-center hover:bg-primary-700 transition-colors shrink-0"
        >
          New message ↓
        </button>
      )}

      {/* Upload progress */}
      {uploading && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mx-3 mb-1 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 flex gap-2 items-center bg-slate-50 shrink-0">
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
        <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors shrink-0 p-1" title="Attach file">
          {uploading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onBlur={emitTypingStop}
          placeholder="Type a message..."
          maxLength={2000}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        />
        <button type="submit" disabled={!input.trim() || uploading}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  )
}
