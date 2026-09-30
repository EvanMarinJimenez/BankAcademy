import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Landmark, Bell, ChevronDown, User, LogOut, Shield
} from 'lucide-react'

export default function ParticipantNavbar() {
  const { profile, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const getInitials = () => {
    if (!profile) return 'US'
    const f = profile.first_name?.[0] || ''
    const l = profile.last_name?.[0] || ''
    return (f + l).toUpperCase() || 'US'
  }

  const getFullName = () => {
    if (!profile) return 'Participante'
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Participante'
  }

  return (
    <header className="navbar" style={{ position: 'relative' }}>
      <div className="navbar__left">
        <Link to="/home" className="brand-mark" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Landmark size={24} />
          <span>SimuBank</span>
        </Link>

        <nav className="navbar__links">
          <NavLink to="/home" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            Inicio
          </NavLink>
          <NavLink to="/simulations" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            Simulaciones
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            Historial
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            Reportes
          </NavLink>
        </nav>
      </div>

      <div className="navbar__right">
        <button className="icon-btn" aria-label="Notificaciones" title="Notificaciones">
          <Bell size={20} />
          <span className="icon-btn__dot"></span>
        </button>

        <div style={{ position: 'relative' }}>
          <div
            className="user-chip"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="user-avatar">{getInitials()}</div>
            <div className="user-chip__info">
              <span className="user-chip__name">{getFullName()}</span>
              <span className="user-chip__role">
                {profile?.role === 'admin' ? 'Administrador' : 'Agente en formación'}
              </span>
            </div>
            <ChevronDown size={16} />
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '200px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                border: '1px solid #E2E8F0',
                padding: '0.5rem',
                zIndex: 1000,
                animation: 'modalFadeIn 0.15s ease-out',
              }}
            >
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  color: '#334155',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'background-color 0.15s',
                }}
              >
                <User size={16} />
                <span>Mi perfil</span>
              </Link>

              {profile?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    color: '#1E3A8A',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  <Shield size={16} />
                  <span>Panel Admin</span>
                </Link>
              )}

              <hr style={{ margin: '0.35rem 0', borderColor: '#F1F5F9', borderWidth: '1px 0 0' }} />

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  color: '#EF4444',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
