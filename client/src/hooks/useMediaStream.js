import { useState, useEffect, useRef, useCallback } from 'react'

async function getStream() {
  // Try full video+audio first
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  } catch {}

  // Try video-only (no mic)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    return stream
  } catch {}

  // Try audio-only (no camera)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    return stream
  } catch {}

  return null
}

export function useMediaStream() {
  const [localStream, setLocalStream] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [error, setError] = useState(null)
  const streamRef = useRef(null)

  useEffect(() => {
    let active = true

    getStream().then((stream) => {
      if (!active) {
        stream?.getTracks().forEach((t) => t.stop())
        return
      }
      if (!stream) {
        setError(
          'No camera or microphone found. Allow access in your browser settings and reload.'
        )
        return
      }
      streamRef.current = stream
      setLocalStream(stream)
      // Reflect actual track presence in initial state
      setAudioEnabled(stream.getAudioTracks().length > 0)
      setVideoEnabled(stream.getVideoTracks().length > 0)
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
