import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Landmark, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import '../styles/login.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.')
      return
    }

    setLoading(true)
    const { error: resetError } = await resetPassword(email.trim())
    setLoading(false)

    if (resetError) {
      setError(resetError.message || 'Error al enviar el enlace de recuperación.')
      return
    }

    setSubmitted(true)
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
            <h2>Recuperar Contraseña</h2>
            <p>Ingresa tu correo para recibir instrucciones de restablecimiento.</p>
          </div>

          {error && (
            <div className="toast toast--error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
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
                Correo enviado
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada o carpeta de spam.
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <div className="input-with-icon">
                  <Mail size={18} strokeWidth={2} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="nombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                <Link to="/login" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                  <ArrowLeft size={16} />
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
