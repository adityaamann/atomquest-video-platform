export default function Logo({ size = 'md', showText = true }) {
  const sizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' }
  const textSizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' }

  return (
    <div className="flex items-center gap-2.5">
      <svg className={sizes[size]} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="#FF6B00" />
        {/* Video camera body */}
        <rect x="5" y="12" width="20" height="14" rx="3" fill="white" />
        {/* Camera lens */}
        <rect x="25" y="15" width="9" height="3" rx="1.5" fill="white" />
        <rect x="25" y="22" width="9" height="3" rx="1.5" fill="white" />
        {/* Headset arc */}
        <path d="M10 22 Q10 28 16 28 Q22 28 22 22" stroke="#FF6B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Headset ear pieces */}
        <circle cx="10" cy="22" r="2" fill="#FF6B00" />
        <circle cx="22" cy="22" r="2" fill="#FF6B00" />
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight ${textSizes[size]}`}>
          <span className="text-white">Support</span>
          <span className="text-brand-500">Vision</span>
        </span>
      )}
    </div>
  )
}
