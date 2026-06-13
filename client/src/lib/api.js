import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      // Network error / timeout — do NOT redirect, let the caller handle it
      return Promise.reject(err)
    }

    const { status, config } = err.response

    // Don't redirect on 401 from auth endpoints — those are credential errors
    const isAuthEndpoint = config?.url?.includes('/api/auth/')
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Show "Session expired" before redirecting
      toast.error('Session expired. Please sign in again.', { id: 'session-expired' })
      setTimeout(() => { window.location.href = '/login' }, 1200)
    }

    if (status === 403) {
      toast.error("You don't have permission to do that.", { id: 'forbidden' })
    }

    if (status >= 500) {
      toast.error('Something went wrong. Please try again.', { id: 'server-error' })
    }

    return Promise.reject(err)
  }
)

// ── Offline / back-online banner ─────────────────────────────────────────────
window.addEventListener('offline', () => {
  toast.error('No internet connection', { id: 'offline', duration: Infinity })
})
window.addEventListener('online', () => {
  toast.dismiss('offline')
  toast.success('Back online', { id: 'back-online', duration: 3000 })
})

export default api
