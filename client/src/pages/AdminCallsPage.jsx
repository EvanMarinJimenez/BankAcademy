import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'
import {
  Phone, Shuffle, Users, RefreshCw, Loader2, PhoneCall, AlertCircle, Unlock
} from 'lucide-react'
import '../styles/admin-calls.css'

export default function AdminCallsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [disponibles, setDisponibles] = useState([])
  const [loading, setLoading] = useState(true)
  const [llamandoId, setLlamandoId] = useState(null) // profile_id en proceso
  const [llamandoRandom, setLlamandoRandom] = useState(false)
  const [liberando, setLiberando] = useState(false)
  const [toast, setToast] = useState(null) // { tipo: 'success'|'error', msg }

  // ─── Cargar lista de participantes disponibles ───────────────────────────
  const cargarDisponibles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/llamadas/disponibles')
      const data = await res.json()
      if (res.ok) setDisponibles(data.disponibles || [])
      else mostrarToast('error', data.error || 'Error al cargar participantes')
    } catch {
      mostrarToast('error', 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDisponibles()
  }, [cargarDisponibles])

  // ─── Toast helper ────────────────────────────────────────────────────────
  const mostrarToast = (tipo, msg) => {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Iniciar llamada (HUL06 y HUL07 comparten esta función) ─────────────
  const iniciarLlamada = async ({ profile_id, id_simulacion }) => {
    try {
      const res = await fetch('http://localhost:3000/api/llamadas/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id,
          id_simulacion,
          iniciada_por: profile?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar llamada')

      mostrarToast('success', `Llamada iniciada con ${data.llamada?.participante?.first_name || 'el participante'}`)
      if (data.llamada?.id_llamada) {
        setTimeout(() => {
          navigate(`/llamada/${data.llamada.id_llamada}`)
        }, 500)
      } else {
        cargarDisponibles()
      }
    } catch (err) {
      mostrarToast('error', err.message)
    }
  }

  // ─── HUL07: Llamar a un estudiante específico ────────────────────────────
  const handleLlamarEspecifico = async (item) => {
    setLlamandoId(item.participante.id)
    await iniciarLlamada({
      profile_id: item.participante.id,
      id_simulacion: item.simulacion.id_simulacion,
    })
    setLlamandoId(null)
  }

  // ─── HUL06: Llamada aleatoria ────────────────────────────────────────────
  const handleLlamadaAleatoria = async () => {
    setLlamandoRandom(true)
    try {
      const res = await fetch('http://localhost:3000/api/llamadas/random')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No hay participantes disponibles')

      await iniciarLlamada({
        profile_id: data.participante.id,
        id_simulacion: data.simulacion.id_simulacion,
      })
    } catch (err) {
      mostrarToast('error', err.message)
    } finally {
      setLlamandoRandom(false)
    }
  }

  // ─── Iniciales del participante ──────────────────────────────────────────
  const getInitials = (p) =>
    ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?'

  // ─── Liberar todos los participantes ocupados ────────────────────────────
  const handleLiberarTodos = async () => {
    if (!window.confirm('¿Liberar todas las llamadas en curso? Esto marcará todas como "finalizada" y los participantes volverán a estar disponibles.')) return
    setLiberando(true)
    try {
      const res = await fetch('http://localhost:3000/api/llamadas/liberar-todas', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al liberar')
      mostrarToast('success', data.message)
      cargarDisponibles()
    } catch (err) {
      mostrarToast('error', err.message)
    } finally {
      setLiberando(false)
    }
  }

  return (
    <AdminLayout pageTitle="Simulaciones" sectionTitle="Gestión de Llamadas">
      <div className="calls-page">

        {/* Toast */}
        {toast && (
          <div className={`calls-toast calls-toast--${toast.tipo}`}>
            {toast.tipo === 'error' ? <AlertCircle size={16} /> : <PhoneCall size={16} />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Cabecera con acción principal */}
        <div className="calls-header">
          <div className="calls-header__info">
            <h2>Participantes disponibles</h2>
            <p>
              {loading
                ? 'Cargando...'
                : `${disponibles.length} participante${disponibles.length !== 1 ? 's' : ''} disponible${disponibles.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="calls-header__actions">
            <button
              className="btn-icon"
              onClick={cargarDisponibles}
              disabled={loading}
              title="Actualizar lista"
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>

            {/* Botón para liberar participantes ocupados */}
            <button
              onClick={handleLiberarTodos}
              disabled={liberando || loading}
              title="Marcar todas las llamadas en curso como finalizadas"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.85rem', borderRadius: '8px',
                border: '1px solid #FCA5A5', backgroundColor: '#FFF1F2',
                color: '#BE123C', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {liberando ? <Loader2 size={15} className="spin" /> : <Unlock size={15} />}
              <span>Liberar todos</span>
            </button>

            {/* HUL06 — Llamada aleatoria */}
            <button
              className="btn-random"
              onClick={handleLlamadaAleatoria}
              disabled={llamandoRandom || disponibles.length === 0 || loading}
            >
              {llamandoRandom ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Shuffle size={18} />
              )}
              <span>Llamada aleatoria</span>
            </button>
          </div>
        </div>

        {/* Tabla de participantes disponibles */}
        <div className="calls-table-wrap">
          {loading ? (
            <div className="calls-empty">
              <Loader2 size={32} className="spin" color="#94A3B8" />
              <p>Cargando participantes...</p>
            </div>
          ) : disponibles.length === 0 ? (
            <div className="calls-empty">
              <div className="calls-empty__icon">
                <Users size={28} />
              </div>
              <h3>Sin participantes disponibles</h3>
              <p>
                No hay participantes con simulaciones de llamada activas asignadas
                o todos están ocupados en este momento.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-refresh" onClick={cargarDisponibles}>
                  <RefreshCw size={15} />
                  Actualizar
                </button>
                <button
                  onClick={handleLiberarTodos}
                  disabled={liberando}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem', borderRadius: '8px',
                    border: '1px solid #FCA5A5', backgroundColor: '#FFF1F2',
                    color: '#BE123C', fontSize: '0.84rem', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {liberando ? <Loader2 size={14} className="spin" /> : <Unlock size={14} />}
                  Liberar todos los ocupados
                </button>
              </div>
            </div>
          ) : (
            <table className="calls-table">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Correo</th>
                  <th>Escenario asignado</th>
                  <th>Dificultad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {disponibles.map((item) => {
                  const p = item.participante
                  const sim = item.simulacion
                  const estaLlamando = llamandoId === p.id

                  return (
                    <tr key={p.id}>
                      {/* Participante */}
                      <td>
                        <div className="participant-cell">
                          <div className="participant-avatar">
                            {getInitials(p)}
                          </div>
                          <span className="participant-name">
                            {p.first_name} {p.last_name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="text-muted">{p.email}</td>

                      {/* Escenario */}
                      <td>
                        <div className="scenario-cell">
                          <Phone size={14} color="#3B82F6" />
                          <span>{sim?.nombre || '—'}</span>
                        </div>
                      </td>

                      {/* Dificultad */}
                      <td>
                        {sim?.parametros?.dificultad ? (
                          <span className={`badge badge--${sim.parametros.dificultad}`}>
                            {sim.parametros.dificultad}
                          </span>
                        ) : '—'}
                      </td>

                      {/* HUL07 — Llamar al específico */}
                      <td>
                        <button
                          className="btn-call"
                          onClick={() => handleLlamarEspecifico(item)}
                          disabled={estaLlamando || llamandoRandom}
                        >
                          {estaLlamando ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <Phone size={15} />
                          )}
                          <span>{estaLlamando ? 'Llamando...' : 'Llamar'}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

