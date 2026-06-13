import { useState, useEffect } from 'react'

export function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const display = [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
  const isLong = elapsed >= 30 * 60

  return { elapsed, display, isLong }
}
