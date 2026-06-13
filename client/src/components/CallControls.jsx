function ControlBtn({ onClick, title, active, danger, recording, disabled, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? 'bg-red-600 hover:bg-red-500 text-white w-12 h-12 shadow-md'
          : active === false
          ? 'bg-red-100 hover:bg-red-200 text-red-600 border border-red-200'
          : recording
          ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400 ring-offset-2'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function CallControls({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  isAgent = false,
  recordingStatus,
  recordingBusy = false,
  onStartRecording,
  onStopRecording,
  networkQuality,
  timer,
}) {
  const isRecording = recordingStatus === 'IN_PROGRESS'

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-6 py-3.5"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>

        {/* Timer */}
        {timer && (
          <span className={`text-sm font-mono tabular-nums mr-2 font-semibold ${timer.isLong ? 'text-red-500' : 'text-slate-600'}`}>
            {timer.display}
          </span>
        )}

        {/* Mute */}
        <ControlBtn onClick={onToggleAudio} title={audioEnabled ? 'Mute' : 'Unmute'} active={audioEnabled}>
          {audioEnabled ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          )}
        </ControlBtn>

        {/* Video toggle */}
        <ControlBtn onClick={onToggleVideo} title={videoEnabled ? 'Turn off camera' : 'Turn on camera'} active={videoEnabled}>
          {videoEnabled ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 6.5l-4-4-15 15 4 4 2.48-2.48C9.52 19.6 10.74 20 12 20c4.42 0 8-3.58 8-8 0-1.26-.4-2.48-1.02-3.52L21 6.5z" />
            </svg>
          )}
        </ControlBtn>

        {/* Recording (agent only) */}
        {isAgent && (
          <ControlBtn
            onClick={isRecording ? onStopRecording : onStartRecording}
            title={recordingBusy ? 'Processing…' : isRecording ? 'Stop Recording' : 'Start Recording'}
            active={true}
            recording={isRecording}
            disabled={recordingBusy}
          >
            {recordingBusy ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
            )}
          </ControlBtn>
        )}

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* End call */}
        {isAgent && (
          <ControlBtn onClick={onEndCall} title="End Session" danger>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
            </svg>
          </ControlBtn>
        )}

        {/* Network quality */}
        {networkQuality && (
          <>
            <div className="w-px h-8 bg-slate-200 mx-1" />
            <div className="flex items-end gap-0.5" title={`${networkQuality.label}: ${networkQuality.ping}ms`}>
              {[1,2,3].map(i => (
                <div key={i} className={`w-1.5 rounded-sm transition-colors ${
                  i <= networkQuality.bars
                    ? networkQuality.bars === 3 ? 'bg-green-500' : networkQuality.bars === 2 ? 'bg-yellow-500' : 'bg-red-500'
                    : 'bg-slate-200'
                }`} style={{ height: `${6 + i * 5}px` }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
