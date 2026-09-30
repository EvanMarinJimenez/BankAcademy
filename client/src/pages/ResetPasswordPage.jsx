import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Landmark, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import '../styles/login.css'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!password || !confirmPassword) {
      setError('Por favor completa todos los campos.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)
    setLoading(false)

    if (updateError) {
      setError(updateError.message || 'Error al actualizar la contraseña.')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      navigate('/login', { replace: true })
    }, 2500)
  }

  return (
    <div className="auth-wrapper">
      <header className="auth-header">
        <div className="brand">
          <div className="brand-icon">
            <Landmark size={28} strokeWidth={2.25} />
          </div>
          <span className="brand-text">SimuBank</span>
        </div>
      </header>

      <main className="auth-main">
        <div className="login-card">
          <div className="login-header">
            <h2>Restablecer Contraseña</h2>
            <p>Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
          </div>

          {error && (
            <div className="toast toast--error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1E293B', marginBottom: '0.5rem', fontWeight: 600 }}>
                ¡Contraseña actualizada!
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Tu contraseña ha sido restablecida con éxito. Redirigiendo al inicio de sesión...
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
                Ir al inicio de sesión ahora
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="new-password">Nueva Contraseña</label>
                <div className="input-with-icon">
                  <Lock size={18} strokeWidth={2} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="new-password"
                    name="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="icon-toggle"
                    aria-label="Mostrar contraseña"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                <div className="input-with-icon">
                  <Lock size={18} strokeWidth={2} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm-password"
                    name="confirm-password"
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="icon-toggle"
                    aria-label="Mostrar confirmar contraseña"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Guardando...' : 'Restablecer contraseña'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
