import { useEffect, useRef } from 'react'

export default function VideoPlayer({ stream, muted = false, label, className = '', audioEnabled = true, videoEnabled = true }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (stream) {
      video.srcObject = stream
    } else {
      video.srcObject = null
    }
    return () => {
      // Clear srcObject on unmount to release media tracks from the element
      if (video) video.srcObject = null
    }
  }, [stream])

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-800 ${className}`}>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center min-h-[120px]">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-2">
              <svg className="w-7 h-7 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <p className="text-slate-400 text-xs">No video</p>
          </div>
        </div>
      )}

      {stream && !videoEnabled && (
        <div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-1">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8zM3 3l18 18" />
              </svg>
            </div>
            <p className="text-slate-400 text-xs">Camera off</p>
          </div>
        </div>
      )}

      {label && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
            {label}
          </div>
          {!audioEnabled && (
            <div className="bg-red-600/90 text-white text-xs px-1.5 py-1 rounded-md flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              Muted
            </div>
          )}
        </div>
      )}
    </div>
  )
}
