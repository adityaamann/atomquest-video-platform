import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../lib/api'
import Navbar from '../components/Navbar'
import Logo from '../components/Logo'
import toast from 'react-hot-toast'

const CATEGORIES = ['Technical Support', 'Billing', 'Product Demo', 'General Inquiry', 'Bug Report']
const DURATIONS = [
  { label: '15 minutes', value: 15 }, { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 }, { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 }, { label: '2 hours', value: 120 },
]
const PRIORITIES = [
  { label: 'Low', value: 'LOW', cls: 'priority-low' },
  { label: 'Medium', value: 'MEDIUM', cls: 'priority-medium' },
  { label: 'High', value: 'HIGH', cls: 'priority-high' },
  { label: 'Urgent', value: 'URGENT', cls: 'priority-urgent' },
]

function Field({ label, error, children, required }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function SuccessScreen({ session, inviteUrl, onStartCall, onBack }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Join my support session: ${inviteUrl}`)}`

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12 page-enter">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Session Created!</h1>
          <p className="text-slate-500 mt-2">Share the invite link with your customer to start the call.</p>
        </div>

        <div className="card mb-4">
          <h2 className="font-semibold text-slate-900 mb-1">{session.title}</h2>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            {session.customerName && <span>Customer: <span className="text-slate-700 font-medium">{session.customerName}</span></span>}
            {session.category && <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs">{session.category}</span>}
          </div>
        </div>

        <div className="card mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Invite Link</p>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4">
            <span className="flex-1 text-sm text-slate-700 truncate font-mono">{inviteUrl}</span>
            <button onClick={copyLink} className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={copyLink} className="btn-primary flex-1 text-sm py-2.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </button>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="btn-secondary flex-1 text-sm py-2.5 justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>

        <div className="card mb-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">QR Code</p>
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <QRCodeSVG value={inviteUrl} size={160} />
          </div>
          <p className="text-xs text-slate-400 mt-3">Customer scans this to join instantly</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onStartCall} className="btn-primary flex-1 py-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            Start Call Now
          </button>
          <button onClick={onBack} className="btn-ghost flex-1 py-3">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreateSession() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', customerName: '', customerEmail: '', date: '', time: '',
    expectedDuration: 30, priority: 'MEDIUM', description: '', category: 'Technical Support',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null)

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'Meeting title is required'
    if (!form.customerName.trim()) e.customerName = 'Customer name is required'
    if (!form.customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      e.customerEmail = 'Valid customer email is required'
    if (!form.date) e.date = 'Date is required'
    if (!form.time) e.time = 'Time is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      let scheduledAt = null
      if (form.date && form.time) {
        scheduledAt = new Date(`${form.date}T${form.time}`).toISOString()
      }
      const { data } = await api.post('/api/sessions', {
        title: form.title.trim(),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        scheduledAt,
        expectedDuration: form.expectedDuration,
        priority: form.priority,
        description: form.description.trim() || null,
        category: form.category,
      })
      setCreated(data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    const inviteUrl = `${window.location.origin}/join/${created.inviteToken}`
    return (
      <SuccessScreen
        session={created}
        inviteUrl={inviteUrl}
        onStartCall={() => navigate(`/sessions/${created.id}/call`)}
        onBack={() => navigate('/dashboard')}
      />
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">New Support Session</h1>
          <p className="text-slate-500 text-sm mt-1">Fill in the meeting details to generate an invite link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="card space-y-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meeting Details</p>

            <Field label="Meeting Title" error={errors.title} required>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Technical Support Call" autoFocus
                className={`input-field ${errors.title ? 'input-error' : ''}`} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Customer Name" error={errors.customerName} required>
                <input type="text" value={form.customerName} onChange={e => set('customerName', e.target.value)}
                  placeholder="John Smith"
                  className={`input-field ${errors.customerName ? 'input-error' : ''}`} />
              </Field>
              <Field label="Customer Email" error={errors.customerEmail} required>
                <input type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)}
                  placeholder="john@example.com"
                  className={`input-field ${errors.customerEmail ? 'input-error' : ''}`} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date (IST)" error={errors.date} required>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  min={today}
                  className={`input-field ${errors.date ? 'input-error' : ''}`} />
              </Field>
              <Field label="Time (IST)" error={errors.time} required>
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                  className={`input-field ${errors.time ? 'input-error' : ''}`} />
              </Field>
            </div>
          </div>

          <div className="card space-y-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Options</p>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected Duration">
                <select value={form.expectedDuration} onChange={e => set('expectedDuration', parseInt(e.target.value))}
                  className="input-field">
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="input-field">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Priority">
              <div className="flex gap-2 flex-wrap">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      form.priority === p.value
                        ? p.value === 'LOW' ? 'border-slate-400 bg-slate-100 text-slate-700'
                          : p.value === 'MEDIUM' ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : p.value === 'HIGH' ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-red-400 bg-red-50 text-red-700'
                        : 'border-transparent bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Issue Summary (optional)">
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} maxLength={500} placeholder="Briefly describe the customer's issue..."
                className="input-field resize-none" />
              <p className="text-xs text-slate-400 mt-1 text-right">{form.description.length}/500</p>
            </Field>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : 'Create Session & Get Invite Link'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost py-3 px-6">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
