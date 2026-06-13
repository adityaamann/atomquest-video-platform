import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

function getStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '', width: '0%' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (pw.length >= 12) s++
  if (s <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500', width: '33%' }
  if (s === 2) return { level: 2, label: 'Fair', color: 'bg-yellow-500', width: '66%' }
  return { level: 3, label: 'Strong', color: 'bg-green-500', width: '100%' }
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function Signup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', company: '' })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const strength = getStrength(form.password)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Full name must be at least 2 characters'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one uppercase letter'
    else if (!/[0-9]/.test(form.password)) e.password = 'Must contain at least one number'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    if (!form.company.trim()) e.company = 'Company name is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', {
        email: form.email, password: form.password, name: form.name.trim(), company: form.company.trim(),
      })
      login(data.token, data.user)
      toast.success('Account created! Welcome to SupportVision.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed'
      if (msg.includes('email') || msg.includes('Email')) setErrors({ email: msg })
      else toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md page-enter">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size="md" /></div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Start running professional support sessions today</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label="Full Name" error={errors.name}>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="John Smith" autoComplete="name" autoFocus
                className={`input-field ${errors.name ? 'input-error' : ''}`} />
            </Field>

            <Field label="Work Email" error={errors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="john@company.com" autoComplete="email"
                className={`input-field ${errors.email ? 'input-error' : ''}`} />
            </Field>

            <Field label="Password" error={errors.password}>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number" autoComplete="new-password"
                  className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: strength.width }} />
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    strength.level === 3 ? 'text-green-600' : strength.level === 2 ? 'text-yellow-600' : 'text-red-500'
                  }`}>{strength.label}</p>
                </div>
              )}
            </Field>

            <Field label="Confirm Password" error={errors.confirm}>
              <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={e => set('confirm', e.target.value)}
                placeholder="Re-enter password" autoComplete="new-password"
                className={`input-field ${errors.confirm ? 'input-error' : ''}`} />
            </Field>

            <Field label="Company Name" error={errors.company}>
              <input type="text" value={form.company} onChange={e => set('company', e.target.value)}
                placeholder="Atomberg Technologies" autoComplete="organization"
                className={`input-field ${errors.company ? 'input-error' : ''}`} />
            </Field>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
