export default function Logo({ size = 'md', dark = false }) {
  const icon = { sm: 18, md: 22, lg: 28 }[size] || 22
  const text = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' }[size] || 'text-xl'
  const pad = icon + 10

  return (
    <div className="flex items-center gap-2 select-none">
      <div className="flex items-center justify-center rounded-lg bg-primary-600 shrink-0"
        style={{ width: pad, height: pad }}>
        <svg width={icon} height={icon} viewBox="0 0 24 24" fill="white">
          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      </div>
      <span className={`font-bold ${text} ${dark ? 'text-white' : 'text-slate-900'}`}>
        Support<span className="text-primary-600">Vision</span>
      </span>
    </div>
  )
}
