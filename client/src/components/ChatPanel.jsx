import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function FileMessage({ msg, isMe }) {
  const isImage = msg.fileType?.startsWith('image/')
  const url = msg.fileUrl?.startsWith('http') ? msg.fileUrl : `${API_BASE}${msg.fileUrl}`

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={msg.content || 'image'} className="max-w-full max-h-48 rounded-lg mt-1 border border-white/10" />
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2 text-xs mt-1 px-3 py-2 rounded-lg border ${isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-700 border-gray-600 text-gray-200'}`}
    >
      <svg className="w-4 h-4 shrink-0 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate max-w-[120px]">{msg.content || 'Download file'}</span>
    </a>
  )
}

function TypingBubble({ name }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-gray-500 mb-1 px-1">{name}</span>
      <div className="bg-gray-800 rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

export default function ChatPanel({ messages, onSend, currentUser, socketRef, sessionId, typingPeer }) {
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimerRef = useRef(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingPeer])

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
    if (!input.trim()) return
    emitTypingStop()
    clearTimeout(typingTimerRef.current)
    onSend(input.trim())
    setInput('')
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSend(file.name, data.fileUrl, data.fileType)
    } catch (err) {
      // Let parent handle errors via toast
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="font-medium text-sm">Chat</span>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{messages.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-8">Messages appear here</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderName === currentUser
          return (
            <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1 px-1">{isMe ? 'You' : msg.senderName}</span>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                isMe
                  ? 'bg-brand-500 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {msg.fileUrl ? <FileMessage msg={msg} isMe={isMe} /> : msg.content}
              </div>
              <span className="text-xs text-gray-600 mt-1 px-1">
                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}

        {typingPeer && <TypingBubble name={typingPeer} />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2 items-center">
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />

        <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}
          className="text-gray-500 hover:text-gray-300 disabled:opacity-50 transition-colors shrink-0 p-1"
        >
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
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
        />
        <button type="submit" disabled={!input.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  )
}
