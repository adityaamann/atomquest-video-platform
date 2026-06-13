import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

let socketInstance = null

export function useSocket() {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      })
    }
    socketRef.current = socketInstance

    return () => {
      // Don't disconnect on unmount — share across components
    }
  }, [])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler)
  }, [])

  return { socket: socketRef, emit, on, off }
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
