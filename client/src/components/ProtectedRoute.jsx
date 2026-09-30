import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protege una ruta: si no hay sesión redirige a login.
 * Si se pasa `requiredRole`, verifica que el perfil tenga ese rol.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  // No hay sesión → al login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Se requiere un rol específico y no coincide
  if (requiredRole && profile?.role !== requiredRole) {
    // Si es admin intentando acceder a área de participante, redirigir a su home
    if (profile?.role === 'admin') {
      return <Navigate to="/admin" replace />
    }
    // Si es participante intentando acceder a área admin, redirigir a su home
    return <Navigate to="/home" replace />
  }

  return children
}
