import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Landmark, ShieldCheck, Users, LineChart,
  User, Lock, Eye, EyeOff
} from 'lucide-react'
import '../styles/login.css'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
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

    if (!identifier.trim() || !password) {
      setError('Por favor completa todos los campos.')
      return
    }

    setLoading(true)

    const { data, error: authError } = await signIn(identifier.trim(), password)

    if (authError) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
      setLoading(false)
      return
    }

    // Obtener rol del usuario para redirigir
    const userRole = data.user?.user_metadata?.role || 'participant'

    if (userRole === 'admin') {
      navigate('/admin', { replace: true })
    } else {
      navigate('/home', { replace: true })
    }
  }

  return (
    <div className="auth-wrapper">
      {/* Panel izquierdo: identidad de marca */}
      <aside className="brand-panel">
        <div className="brand-panel__content">
          <div className="brand-mark">
            <Landmark size={26} strokeWidth={2.25} />
            <span>SimuBank</span>
          </div>

          <div className="brand-message">
            <h1>Practica banca real,<br />sin riesgo real.</h1>
            <p>
              Simulaciones de atención, transacciones y procesos bancarios
              pensadas para formar al equipo de Banking Academy.
            </p>
          </div>

          <ul className="brand-highlights">
            <li>
              <ShieldCheck size={20} strokeWidth={2} />
              <span>Entorno 100% de práctica</span>
            </li>
            <li>
              <Users size={20} strokeWidth={2} />
              <span>Simulaciones entre participantes</span>
            </li>
            <li>
              <LineChart size={20} strokeWidth={2} />
              <span>Seguimiento de tu progreso</span>
            </li>
          </ul>
        </div>

        <p className="brand-footer">© 2026 Banking Academy — Proyecto SimuBank</p>
      </aside>

      {/* Panel derecho: formulario */}
      <main className="form-panel">
        <div className="form-card">
          <div className="form-header">
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales para acceder a tu simulación.</p>
          </div>

          {error && (
            <div className="toast toast--error">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="identifier">Correo electrónico</label>
              <div className="input-with-icon">
                <User size={18} strokeWidth={2} />
                <input
                  type="email"
                  id="identifier"
                  name="identifier"
                  placeholder="nombre@correo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <div className="input-with-icon">
                <Lock size={18} strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
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

            <div className="field-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="checkbox__box"></span>
                <span>Recordarme</span>
              </label>
              <Link to="/forgot-password" className="link">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <div className="divider"><span>o</span></div>

            <p className="signup-text">
              ¿No tienes cuenta? <Link to="/register" className="link">Regístrate aquí</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
