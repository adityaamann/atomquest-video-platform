import { useState, useEffect, useRef, useCallback } from 'react'

export function useMediaStream() {
  const [localStream, setLocalStream] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [error, setError] = useState(null)
  const streamRef = useRef(null)

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setLocalStream(stream)
      })
      .catch((err) => {
        console.error('getUserMedia error:', err)
        setError(err.message || 'Could not access camera/microphone')
      })
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const toggleAudio = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const track = stream.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setAudioEnabled(track.enabled)
    }
  }, [])

  const toggleVideo = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    const track = stream.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setVideoEnabled(track.enabled)
    }
  }, [])

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLocalStream(null)
  }, [])

  return { localStream, audioEnabled, videoEnabled, error, toggleAudio, toggleVideo, stopAll }
}
