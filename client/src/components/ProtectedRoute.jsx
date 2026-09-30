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

  // Obtener rol actual (del perfil o de user_metadata, por defecto participant)
  const currentRole = profile?.role || session.user?.user_metadata?.role || 'participant'

  // Si se requiere rol admin y el usuario no es admin
  if (requiredRole === 'admin' && currentRole !== 'admin') {
    return <Navigate to="/home" replace />
  }

  // Si se requiere rol participante y el usuario es admin
  if (requiredRole === 'participant' && currentRole === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return children
}
