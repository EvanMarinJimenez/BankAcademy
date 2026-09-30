import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import AdminHomePage from './pages/AdminHomePage'

// Si está logueado y va al login, redirigir a su home
function RedirectIfAuth({ children }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  if (session && profile) {
    return profile.role === 'admin'
      ? <Navigate to="/admin" replace />
      : <Navigate to="/home" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Raíz redirige al login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Login participante */}
      <Route path="/login" element={
        <RedirectIfAuth>
          <LoginPage />
        </RedirectIfAuth>
      } />

      {/* Login admin */}
      <Route path="/admin/login" element={
        <RedirectIfAuth>
          <AdminLoginPage />
        </RedirectIfAuth>
      } />

      {/* Recuperación de contraseña */}
      <Route path="/forgot-password" element={
        <RedirectIfAuth>
          <ForgotPasswordPage />
        </RedirectIfAuth>
      } />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Home participante (protegido) */}
      <Route path="/home" element={
        <ProtectedRoute requiredRole="participant">
          <HomePage />
        </ProtectedRoute>
      } />

      {/* Home admin (protegido) */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminHomePage />
        </ProtectedRoute>
      } />

      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}