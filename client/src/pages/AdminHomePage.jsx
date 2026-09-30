import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AdminHomePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Bienvenido, Administrador 👋</h1>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        Panel administrativo — en construcción.
      </p>
      <p style={{ color: '#64748B', marginTop: '4px' }}>
        Rol: {profile?.role} · Email: {profile?.email}
      </p>
      <button
        onClick={handleSignOut}
        style={{
          marginTop: '24px',
          padding: '10px 20px',
          background: '#1E3A8A',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Cerrar sesión
      </button>
    </main>
  )
}
