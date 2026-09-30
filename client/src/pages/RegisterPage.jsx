import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Landmark, User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react'
import '../styles/login.css'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe contener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (!termsAccepted) {
      setError('Debes aceptar los términos y condiciones para continuar.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await signUp(email.trim(), password, {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      role: 'participant',
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message || 'Error al registrar tu cuenta. Por favor intenta de nuevo.')
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

      <main className="auth-main" style={{ maxWidth: '520px', width: '100%', margin: '0 auto' }}>
        <div className="login-card" style={{ maxWidth: '100%' }}>
          <div className="login-header">
            <h2>Crear Cuenta</h2>
            <p>Regístrate como participante en la plataforma de entrenamiento.</p>
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
                ¡Registro completado!
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Tu cuenta ha sido creada exitosamente. Redirigiendo al inicio de sesión...
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="field">
                  <label htmlFor="first_name">Nombre(s) *</label>
                  <div className="input-with-icon">
                    <User size={18} strokeWidth={2} />
                    <input
                      type="text"
                      id="first_name"
                      placeholder="Juan"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="last_name">Apellidos *</label>
                  <div className="input-with-icon">
                    <User size={18} strokeWidth={2} />
                    <input
                      type="text"
                      id="last_name"
                      placeholder="Pérez"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="email">Correo electrónico *</label>
                <div className="input-with-icon">
                  <Mail size={18} strokeWidth={2} />
                  <input
                    type="email"
                    id="email"
                    placeholder="juan.perez@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="phone">Teléfono (opcional)</label>
                <div className="input-with-icon">
                  <Phone size={18} strokeWidth={2} />
                  <input
                    type="tel"
                    id="phone"
                    placeholder="+52 55 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="field">
                  <label htmlFor="password">Contraseña *</label>
                  <div className="input-with-icon">
                    <Lock size={18} strokeWidth={2} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Mín. 6 carac."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="icon-toggle"
                      aria-label="Mostrar contraseña"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="confirmPassword">Confirmar *</label>
                  <div className="input-with-icon">
                    <Lock size={18} strokeWidth={2} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      placeholder="Repetir..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="icon-toggle"
                      aria-label="Mostrar contraseña"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="field-row" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span className="checkbox__box"></span>
                  <span style={{ fontSize: '0.825rem' }}>
                    Acepto los términos del programa de entrenamiento
                  </span>
                </label>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                <span>{loading ? 'Creando cuenta...' : 'Completar registro'}</span>
                {!loading && <ArrowRight size={17} />}
              </button>

              <div className="divider"><span>o</span></div>

              <p className="signup-text">
                ¿Ya tienes una cuenta? <Link to="/login" className="link">Inicia sesión aquí</Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
