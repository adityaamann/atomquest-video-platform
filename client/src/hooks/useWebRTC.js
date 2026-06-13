import { useState, useRef, useCallback, useEffect } from 'react'

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export function useWebRTC({ localStream, socketRef }) {
  const [remoteStreams, setRemoteStreams] = useState({}) // socketId → MediaStream
  const peersRef = useRef({})
  const localStreamRef = useRef(null)

  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  const createPeer = useCallback(
    (targetSocketId, initiator) => {
      if (peersRef.current[targetSocketId]) {
        peersRef.current[targetSocketId].close()
      }

      const pc = new RTCPeerConnection(ICE_CONFIG)

      // Add local tracks to this connection
      const stream = localStreamRef.current
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      }

      // Receive remote stream
      pc.ontrack = (e) => {
        if (e.streams?.[0]) {
          setRemoteStreams((prev) => ({ ...prev, [targetSocketId]: e.streams[0] }))
        }
      }

      // Relay ICE candidates through server
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit('signal', {
            targetSocketId,
            signal: { type: 'ice-candidate', candidate: e.candidate.toJSON() },
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setRemoteStreams((prev) => {
            const next = { ...prev }
            delete next[targetSocketId]
            return next
          })
        }
      }

      peersRef.current[targetSocketId] = pc

      if (initiator) {
        pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socketRef.current?.emit('signal', {
              targetSocketId,
              signal: { type: 'offer', sdp: pc.localDescription },
            })
          })
          .catch(console.error)
      }

      return pc
    },
    [socketRef]
  )

  const handleSignal = useCallback(
    async ({ fromSocketId, signal }) => {
      let pc = peersRef.current[fromSocketId]

      if (signal.type === 'offer') {
        if (!pc) pc = createPeer(fromSocketId, false)
        try {
          await pc.setRemoteDescription(signal.sdp)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socketRef.current?.emit('signal', {
            targetSocketId: fromSocketId,
            signal: { type: 'answer', sdp: pc.localDescription },
          })
        } catch (err) {
          console.error('Error handling offer:', err)
        }
      } else if (signal.type === 'answer') {
        try {
          await pc?.setRemoteDescription(signal.sdp)
        } catch (err) {
          console.error('Error handling answer:', err)
        }
      } else if (signal.type === 'ice-candidate') {
        try {
          if (pc && signal.candidate) {
            await pc.addIceCandidate(signal.candidate)
          }
        } catch (err) {
          console.error('Error adding ICE candidate:', err)
        }
      }
    },
    [createPeer, socketRef]
  )

  const cleanupPeer = useCallback((socketId) => {
    peersRef.current[socketId]?.close()
    delete peersRef.current[socketId]
    setRemoteStreams((prev) => {
      const next = { ...prev }
      delete next[socketId]
      return next
    })
  }, [])

  const cleanupAll = useCallback(() => {
    Object.values(peersRef.current).forEach((pc) => pc.close())
    peersRef.current = {}
    setRemoteStreams({})
  }, [])

  return { remoteStreams, createPeer, handleSignal, cleanupPeer, cleanupAll }
}
