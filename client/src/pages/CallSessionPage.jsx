import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Mic, MicOff, Volume2, VolumeX, PhoneOff,
  Landmark, LogOut, Info
} from 'lucide-react'
import '../styles/llamada-usuario.css'

export default function CallSessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [llamada, setLlamada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Controles de llamada
  const [muted, setMuted] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [elapsed, setElapsed] = useState(0) // segundos
  const [notas, setNotas] = useState('')

  const timerRef = useRef(null)

  // ─── Cargar datos de la llamada ───────────────────────────────────────────
  useEffect(() => {
    const fetchLlamada = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/llamadas/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Llamada no encontrada')
        setLlamada(data.llamada)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLlamada()
  }, [id])

  // ─── Temporizador ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!llamada) return

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [llamada])

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // ─── Finalizar llamada ────────────────────────────────────────────────────
  const finalizarLlamada = useCallback(async () => {
    clearInterval(timerRef.current)

    try {
      await fetch(`http://localhost:3000/api/llamadas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'finalizada', notas_admin: notas }),
      })
    } catch {
      // Si falla el PATCH no bloqueamos la navegación
    }

    navigate('/home')
  }, [id, notas, navigate])

  // ─── Checklist del escenario (desde parámetros o defaults) ───────────────
  const getChecklist = () => {
    const params = llamada?.simulacion?.parametros || {}
    return [
      { label: 'Saludar al cliente y presentarse', done: true },
      { label: 'Escuchar el motivo de la llamada', done: true },
      { label: 'Validar identidad del cliente', done: false },
      { label: 'Ofrecer solución dentro del protocolo', done: false },
      {
        label: `Mantener tono ${params.tono_cliente === 'difícil' ? 'profesional ante cliente difícil' : 'amable y empático'}`,
        done: false,
      },
      { label: 'Confirmar resolución y despedirse', done: false },
    ]
  }

  // ─── Pantallas de carga / error ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#64748B' }}>Cargando llamada...</p>
      </div>
    )
  }

  if (error || !llamada) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#EF4444', fontWeight: 600 }}>{error || 'Llamada no encontrada'}</p>
        <button onClick={() => navigate('/home')} style={{ padding: '0.5rem 1.25rem', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  const sim = llamada.simulacion || {}
  const params = sim.parametros || {}
  const checklist = getChecklist()
  const participanteNombre = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()

  return (
    <div>
      {/* ── Barra superior ─────────────────────────────────────────── */}
      <header className="session-bar">
        {/* Marca */}
        <div className="brand-mark">
          <Landmark size={18} />
          <span>SimuBank</span>
        </div>

        {/* Centro: sesión activa + timer */}
        <div className="session-bar__center">
          <span className="session-tag">
            <span className="session-tag__dot" />
            En llamada
          </span>
          <span className="session-timer">{formatTime(elapsed)}</span>
        </div>

        {/* Salir */}
        <button
          className="session-bar__exit"
          onClick={finalizarLlamada}
          title="Finalizar y salir"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* ── Área principal 3 columnas ──────────────────────────────── */}
      <div className="session-main">

        {/* ── Panel izquierdo: datos del "cliente" simulado ─────────── */}
        <aside className="panel client-panel">
          <div className="client-panel__head">
            <div className="client-avatar">CL</div>
            <h2>Cliente simulado</h2>
            <p className="client-meta">Escenario de práctica</p>
            <span className="priority-tag priority-tag--normal">
              {params.dificultad ? `Dificultad: ${params.dificultad}` : 'Normal'}
            </span>
          </div>

          <ul className="client-info-list">
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Info size={13} />
                Escenario
              </span>
              <span className="client-info-item__value">{sim.nombre || '—'}</span>
            </li>
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Info size={13} />
                Duración máx.
              </span>
              <span className="client-info-item__value">
                {params.duracion_minutos ? `${params.duracion_minutos} min` : '—'}
              </span>
            </li>
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Info size={13} />
                Tono del cliente
              </span>
              <span className="client-info-item__value" style={{ textTransform: 'capitalize' }}>
                {params.tono_cliente || 'Normal'}
              </span>
            </li>
          </ul>

          {sim.descripcion && (
            <div className="client-panel__note">
              <Info size={16} />
              <p>{sim.descripcion}</p>
            </div>
          )}
        </aside>

        {/* ── Panel central: visualización de la llamada ─────────────── */}
        <section className="call-stage">
          {/* Visual de llamada */}
          <div className="call-visual">
            <div className="call-ring call-ring--1" />
            <div className="call-ring call-ring--2" />
            <div className="call-avatar">CL</div>
          </div>

          <p className="call-name">Cliente bancario</p>
          <p className="call-status">● Llamada en curso</p>

          {/* Controles (mute, speaker) */}
          <div className="call-controls">
            <button
              className="call-control"
              onClick={() => setMuted((m) => !m)}
              title={muted ? 'Activar micrófono' : 'Silenciar'}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              className="call-control"
              onClick={() => setSpeakerOff((s) => !s)}
              title={speakerOff ? 'Activar audio' : 'Silenciar audio'}
            >
              {speakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Finalizar llamada */}
          <button className="end-call-btn" onClick={finalizarLlamada}>
            <PhoneOff size={18} />
            <span>Finalizar llamada</span>
          </button>
        </section>

        {/* ── Panel derecho: guía y notas ───────────────────────────── */}
        <aside className="panel guide-panel">
          <div className="guide-panel__section">
            <h3>Lista de verificación</h3>
            <ul className="checklist">
              {checklist.map((item, i) => (
                <li key={i}>
                  <span className={`checklist__box ${item.done ? 'checked' : ''}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="guide-panel__section">
            <h3>Mis notas</h3>
            <textarea
              className="notes-area"
              placeholder="Escribe aquí observaciones durante la llamada..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

