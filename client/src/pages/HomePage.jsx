import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
      <h1>Hola, {profile?.first_name || 'Participante'} 👋</h1>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        Dashboard del participante — en construcción.
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
