import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import CreateSession from './pages/CreateSession'
import AgentCall from './pages/AgentCall'
import JoinCall from './pages/JoinCall'
import CustomerCall from './pages/CustomerCall'
import SessionHistory from './pages/SessionHistory'
import Admin from './pages/Admin'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AgentRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'AGENT') return <Navigate to="/" replace />
  return children
}

function RootRedirect() {
  return <Landing />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Agent routes */}
            <Route path="/dashboard" element={<AgentRoute><Dashboard /></AgentRoute>} />
            <Route path="/sessions/new" element={<AgentRoute><CreateSession /></AgentRoute>} />
            <Route path="/sessions" element={<Navigate to="/dashboard" replace />} />
            <Route path="/sessions/:id/call" element={<AgentRoute><AgentCall /></AgentRoute>} />
            <Route path="/sessions/:id/history" element={<AgentRoute><SessionHistory /></AgentRoute>} />
            <Route path="/admin" element={<AgentRoute><Admin /></AgentRoute>} />

            {/* Customer routes */}
            <Route path="/join/:token" element={<JoinCall />} />
            <Route path="/call/:sessionId" element={<CustomerCall />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
