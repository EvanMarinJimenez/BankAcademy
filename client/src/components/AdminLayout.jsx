import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Landmark,
  LayoutDashboard,
  Users,
  Phone,
  MessageCircle,
  CalendarCheck,
  Activity,
  ClipboardCheck,
  Mic,
  FileText,
  LogOut,
  Bell
} from 'lucide-react'
import '../styles/admin-common.css'

export default function AdminLayout({ children, pageTitle = 'Administración', sectionTitle = '' }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  const getInitials = () => {
    if (!profile) return 'AD'
    const f = profile.first_name?.[0] || ''
    const l = profile.last_name?.[0] || ''
    return (f + l).toUpperCase() || 'AD'
  }

  const getFullName = () => {
    if (!profile) return 'Admin Banking Academy'
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Administrador'
  }

  return (
    <div className="admin-app-container" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Landmark size={24} />
          <span>SimuBank</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Panel principal</span>
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Usuarios</span>
          </NavLink>

          <div className="nav-section-title">SIMULACIONES</div>

          <NavLink
            to="/admin/calls"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Phone size={20} />
            <span>Llamadas</span>
          </NavLink>

          <NavLink
            to="/admin/chats"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <MessageCircle size={20} />
            <span>Chats</span>
          </NavLink>

          <NavLink
            to="/admin/assignments"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <CalendarCheck size={20} />
            <span>Asignaciones</span>
          </NavLink>

          <div className="nav-section-title">OPERACIÓN</div>

          <NavLink
            to="/admin/monitoring"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Activity size={20} />
            <span>Monitoreo</span>
          </NavLink>

          <div className="nav-section-title">EVALUACIÓN</div>

          <NavLink
            to="/admin/evaluations"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <ClipboardCheck size={20} />
            <span>Evaluaciones</span>
          </NavLink>

          <NavLink
            to="/admin/recordings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Mic size={20} />
            <span>Grabaciones</span>
          </NavLink>

          <NavLink
            to="/admin/reports"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Reportes</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            onClick={handleLogout}
            className="nav-item logout"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
          >
            <LogOut size={20} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Topbar */}
        <header className="topbar">
          <div>
            <p className="page-label">{pageTitle}</p>
            <h1>{sectionTitle || pageTitle}</h1>
          </div>

          <div className="admin-profile">
            <div className="notification" title="Notificaciones">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </div>

            <div className="profile-info">
              <div className="profile-avatar">
                {getInitials()}
              </div>

              <div>
                <strong>{getFullName()}</strong>
                <span>Administrador</span>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
