import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ParticipantNavbar from '../components/ParticipantNavbar'
import {
  ArrowLeft, Mail, Phone, Calendar, Pencil, CheckCircle2,
  Star, Clock, Flame, Shield, X, Lock, AlertCircle, Save
} from 'lucide-react'
import '../styles/perfil-usuario.css'

export default function ProfilePage() {
  const { profile, updateProfile, updatePassword } = useAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [wantChangePassword, setWantChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setPhone(profile.phone || '')
      setWantChangePassword(false)
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [profile, isEditing])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim()) {
      showToast('Nombre y apellido son obligatorios.', 'error')
      return
    }

    if (wantChangePassword) {
      if (!newPassword || newPassword.length < 6) {
        showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error')
        return
      }
      if (newPassword !== confirmPassword) {
        showToast('Las contraseñas no coinciden.', 'error')
        return
      }
    }

    setLoading(true)

    try {
      // 1. Update profile details
      const { error: profileError } = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })

      if (profileError) throw profileError

      // 2. Update password if specified
      if (wantChangePassword && newPassword) {
        const { error: passError } = await updatePassword(newPassword)
        if (passError) throw passError
        setNewPassword('')
        setConfirmPassword('')
        setWantChangePassword(false)
      }

      showToast('¡Perfil actualizado con éxito!')
      setIsEditing(false)
    } catch (err) {
      showToast(err.message || 'Error al actualizar el perfil', 'error')
    } finally {
      setLoading(false)
    }
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

  const getMemberSince = () => {
    if (!profile?.created_at) return 'ene. 2026'
    const date = new Date(profile.created_at)
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
  }

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ParticipantNavbar />

      <main className="main" style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Link to="/home" className="back-link">
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>

        {toast && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
              color: toast.type === 'error' ? '#991B1B' : '#065F46',
              border: `1px solid ${toast.type === 'error' ? '#F87171' : '#34D399'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Encabezado de perfil */}
        <section className="profile-header">
          <div className="profile-header__left">
            <div className="profile-avatar">{getInitials()}</div>

            <div className="profile-header__info">
              <div className="profile-header__name-row">
                <h1>{getFullName()}</h1>
                <span className={`badge ${profile?.is_active ? 'badge--available' : 'badge--unavailable'}`}>
                  <span className={`status-dot ${profile?.is_active ? 'status-dot--available' : 'status-dot--unavailable'}`}></span>
                  {profile?.is_active ? 'Activo / Disponible' : 'Inactivo'}
                </span>
              </div>
              <p className="profile-header__role">
                {profile?.role === 'admin' ? 'Administrador del Sistema' : 'Agente en formación · Banking Academy'}
              </p>

              <div className="profile-header__meta">
                <span>
                  <Mail size={16} /> {profile?.email}
                </span>
                <span>
                  <Phone size={16} /> {profile?.phone || 'Sin teléfono registrado'}
                </span>
                <span>
                  <Calendar size={16} /> Miembro desde {getMemberSince()}
                </span>
              </div>
            </div>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setIsEditing(!isEditing)}
            style={{ cursor: 'pointer' }}
          >
            {isEditing ? <X size={16} /> : <Pencil size={16} />}
            {isEditing ? 'Cancelar edición' : 'Editar perfil'}
          </button>
        </section>

        {/* Formulario de Edición (HUU03) */}
        {isEditing && (
          <section
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: '1.25rem' }}>
              Modificar Información Personal (HUU03)
            </h2>

            <form onSubmit={handleSaveProfile} autoComplete="off">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Nombre(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    autoComplete="given-name"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    autoComplete="family-name"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      backgroundColor: '#F1F5F9',
                      color: '#64748B',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+506 8888 8888"
                    disabled={loading}
                    autoComplete="tel"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Toggle para cambiar contraseña */}
              <div style={{ padding: '1rem 1.25rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={wantChangePassword}
                    onChange={(e) => {
                      setWantChangePassword(e.target.checked)
                      if (!e.target.checked) {
                        setNewPassword('')
                        setConfirmPassword('')
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#1E3A8A', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>
                    Deseo cambiar mi contraseña
                  </span>
                </label>

                {wantChangePassword && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.3rem' }}>
                        Nueva Contraseña (mínimo 6 caracteres) *
                      </label>
                      <input
                        type="password"
                        required={wantChangePassword}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.3rem' }}>
                        Confirmar Nueva Contraseña *
                      </label>
                      <input
                        type="password"
                        required={wantChangePassword}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repetir nueva contraseña"
                        disabled={loading}
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.625rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1E3A8A',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Save size={16} />
                  <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Resumen de estadísticas */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="stat-card__value">142</p>
              <p className="stat-card__label">Simulaciones completadas</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <Star size={24} />
            </div>
            <div>
              <p className="stat-card__value">92%</p>
              <p className="stat-card__label">Evaluación promedio</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--secondary">
              <Clock size={24} />
            </div>
            <div>
              <p className="stat-card__value">4:32</p>
              <p className="stat-card__label">Tiempo promedio de atención</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <Flame size={24} />
            </div>
            <div>
              <p className="stat-card__value">6 días</p>
              <p className="stat-card__label">Racha activa</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
