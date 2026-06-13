import { Component } from 'react'
import Logo from './Logo'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-6">
          <div className="flex justify-center"><Logo size="md" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 text-sm">
              An unexpected error occurred. Please refresh the page.
            </p>
            {this.state.error?.message && (
              <p className="mt-3 text-xs text-slate-600 font-mono bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-left">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2.5"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
}
