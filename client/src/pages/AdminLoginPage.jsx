import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Landmark, ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, Shield
} from 'lucide-react'
import '../styles/admin-login.css'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Por favor completa todos los campos.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await signIn(email.trim(), password)

    if (authError) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
      setLoading(false)
      return
    }

    // Verificar que sea admin
    const userRole = data.user?.user_metadata?.role
    if (userRole !== 'admin') {
      setError('No tienes permisos de administrador.')
      setLoading(false)
      return
    }

    navigate('/admin', { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <div className="brand-mark">
            <Landmark size={24} strokeWidth={2.25} />
            <span>SimuBank</span>
          </div>

          <div className="login-icon">
            <ShieldCheck size={25} />
          </div>

          <h1>Acceso administrativo</h1>
          <p>
            Inicia sesión para administrar las funcionalidades
            de la plataforma.
          </p>
        </div>

        {error && (
          <div className="toast toast--error">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="usuario">Correo electrónico</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                id="usuario"
                placeholder="admin@bankingacademy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label="Mostrar contraseña"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-option">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Recordarme</span>
            </label>
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            <span>{loading ? 'Iniciando sesión...' : 'Iniciar sesión'}</span>
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="login-footer">
          <Shield size={15} />
          <span>Acceso protegido para usuarios autorizados</span>
        </div>
      </section>
    </main>
  )
}
