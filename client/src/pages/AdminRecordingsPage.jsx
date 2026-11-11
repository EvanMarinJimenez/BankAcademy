import { useState, useEffect, useCallback, useMemo } from 'react'
import AdminLayout from '../components/AdminLayout'
import {
  Mic, Search, Phone, Calendar, Clock,
  FileText, Download, RefreshCw, X, Trash2,
  Sparkles,
} from 'lucide-react'
import { urlGrabacion } from '../utils/grabaciones'
import '../styles/admin-recordings.css'

export default function AdminRecordingsPage() {
  const [grabaciones, setGrabaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eliminandoId, setEliminandoId] = useState(null)
  const [noDisponibles, setNoDisponibles] = useState(() => new Set())

  // Modal de Transcripción
  const [transcriptModal, setTranscriptModal] = useState({
    isOpen: false,
    grabacion: null,
    loading: false,
    transcripcion: null,
  })

  const fetchGrabaciones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/llamadas/grabaciones')
      const data = await res.json()
      if (res.ok) {
        setGrabaciones(data.grabaciones || [])
      }
    } catch (err) {
      console.error('Error al cargar grabaciones:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGrabaciones()
  }, [fetchGrabaciones])

  // Eliminar grabación
  const eliminarGrabacion = async (grab) => {
    if (!window.confirm(`¿Eliminar la grabación de la Llamada #${grab.id_llamada}? Esta acción no se puede deshacer.`)) return
    setEliminandoId(grab.id_grabacion)
    try {
      const res = await fetch(`/api/llamadas/grabaciones/${grab.id_grabacion}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setGrabaciones((prev) => prev.filter((g) => g.id_grabacion !== grab.id_grabacion))
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar la grabación')
      }
    } catch {
      alert('No se pudo conectar con el servidor')
    } finally {
      setEliminandoId(null)
    }
  }

  // Cargar transcripción de una grabación específica
  const verTranscripcion = async (grabacion) => {
    setTranscriptModal({
      isOpen: true,
      grabacion,
      loading: true,
      transcripcion: null,
    })

    try {
      const res = await fetch(`/api/llamadas/${grabacion.id_llamada}/transcripcion`)
      const data = await res.json()
      let contenidoParsed = []
      if (data.transcripcion?.contenido) {
        try {
          contenidoParsed = typeof data.transcripcion.contenido === 'string'
            ? JSON.parse(data.transcripcion.contenido)
            : data.transcripcion.contenido
        } catch {
          contenidoParsed = [{ emisor: 'Transcripción', texto: data.transcripcion.contenido, tiempo: '00:00' }]
        }
      }
      setTranscriptModal((prev) => ({
        ...prev,
        loading: false,
        transcripcion: contenidoParsed,
      }))
    } catch {
      setTranscriptModal((prev) => ({ ...prev, loading: false, transcripcion: [] }))
    }
  }

  const cerrarModal = () =>
    setTranscriptModal({ isOpen: false, grabacion: null, loading: false, transcripcion: null })

  const formatSecs = (secs) => {
    if (!secs) return '00:00'
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const formatFecha = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  // Filtrado en memoria
  const filteredGrabaciones = useMemo(() => {
    return grabaciones.filter((g) => {
      const llam = g.llamada || {}
      const sim = llam.simulacion || {}
      const part = llam.participante_llamada?.[0]?.profiles || {}

      return search.trim() === '' ||
        (sim.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (`${part.first_name || ''} ${part.last_name || ''}`).toLowerCase().includes(search.toLowerCase()) ||
        (part.email || '').toLowerCase().includes(search.toLowerCase())
    })
  }, [grabaciones, search])

  return (
    <AdminLayout pageTitle="Evaluación" sectionTitle="Grabaciones de Llamadas">
      <div style={{ padding: '0 2rem 2rem' }}>

        {/* Resumen KPIs */}
        <section className="stats-grid" style={{ margin: '1.5rem 0' }}>
          <article className="stat-card">
            <div className="stat-icon blue">
              <Mic size={22} />
            </div>
            <div>
              <span>Total de grabaciones</span>
              <strong>{grabaciones.length}</strong>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon green">
              <Phone size={22} />
            </div>
            <div>
              <span>Duración total</span>
              <strong>{formatSecs(grabaciones.reduce((t, g) => t + (g.duracion || 0), 0))}</strong>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon purple">
              <Sparkles size={22} />
            </div>
            <div>
              <span>Con transcripción</span>
              <strong>{grabaciones.filter((g) => g.llamada?.transcripcion).length}</strong>
            </div>
          </article>
        </section>

        {/* Filtros y buscador */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px',
          border: '1px solid #E2E8F0', padding: '1rem 1.25rem',
          display: 'flex', gap: '0.75rem', alignItems: 'center',
          flexWrap: 'wrap', marginBottom: '1.5rem',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Buscar por participante o escenario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                border: '1px solid #CBD5E1', borderRadius: '8px',
                fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={fetchGrabaciones}
            title="Recargar grabaciones"
            style={{
              padding: '0.5rem', borderRadius: '8px', border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex',
              alignItems: 'center', color: '#64748B',
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Listado de grabaciones */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94A3B8', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <RefreshCw size={28} style={{ margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0 }}>Cargando grabaciones almacenadas...</p>
          </div>
        ) : filteredGrabaciones.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94A3B8', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <Mic size={40} style={{ margin: '0 auto 1rem', opacity: 0.35 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No hay grabaciones registradas aún</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
              Las grabaciones y transcripciones se almacenan automáticamente al finalizar una llamada de simulación.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredGrabaciones.map((grab) => {
              const llam = grab.llamada || {}
              const sim = llam.simulacion || {}
              const part = llam.participante_llamada?.[0]?.profiles || {}
              const nombreParticipante = `${part.first_name || 'Participante'} ${part.last_name || ''}`.trim()
              const estaEliminando = eliminandoId === grab.id_grabacion

              return (
                <div
                  key={grab.id_grabacion}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    opacity: estaEliminando ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Info izquierda */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '10px',
                      backgroundColor: '#EFF6FF', color: '#1D4ED8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Phone size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#1E293B' }}>
                          {nombreParticipante}
                        </h3>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                          borderRadius: '999px', backgroundColor: '#DBEAFE', color: '#1E40AF',
                        }}>
                          Llamada #{llam.id_llamada || grab.id_llamada}
                        </span>
                      </div>

                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                        Escenario: <strong>{sim.nombre || 'Simulación bancaria'}</strong>
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem', color: '#94A3B8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
                          Duración: {formatSecs(grab.duracion || llam.duracion)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />
                          {formatFecha(grab.fecha_creacion)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reproductor de audio */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', maxWidth: '380px', minWidth: '260px' }}>
                    {noDisponibles.has(grab.id_grabacion) ? (
                      <span style={{ fontSize: '0.8rem', color: '#B91C1C', fontWeight: 600 }}>
                        El archivo de audio no está disponible en el servidor.
                      </span>
                    ) : (
                    <audio
                      controls
                      onError={() => setNoDisponibles((prev) => new Set(prev).add(grab.id_grabacion))}
                      src={urlGrabacion(grab.url_archivo)}
                      style={{ width: '100%', height: '36px', outline: 'none' }}
                      preload="none"
                    >
                      Tu navegador no soporta el reproductor de audio.
                    </audio>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
  <button
    onClick={() => verTranscripcion(grab)}
    style={{
      padding: '0.5rem 0.9rem', borderRadius: '8px',
      border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
      color: '#1E3A8A', fontSize: '0.8rem', fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
  >
    <FileText size={15} />
    Ver transcripción
  </button>
  <a
    href={urlGrabacion(grab.url_archivo)}
    download
    style={{
      padding: '0.5rem 0.9rem', borderRadius: '8px',
      border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
      color: '#1E3A8A', fontSize: '0.8rem', fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
      textDecoration: 'none',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
  >
    <Download size={15} />
    Descargar
  </a>
</div>

                    <button
                      onClick={() => eliminarGrabacion(grab)}
                      disabled={estaEliminando}
                      title="Eliminar grabación"
                      style={{
                        padding: '0.5rem', borderRadius: '8px',
                        border: '1px solid #FCA5A5', backgroundColor: '#FFF1F2',
                        color: '#BE123C', cursor: estaEliminando ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => !estaEliminando && (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFF1F2'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Modal de Transcripción ─────────────────────────────────── */}
      {transcriptModal.isOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem',
          }}
          onClick={cerrarModal}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '16px',
              maxWidth: '650px', width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              padding: '2rem', position: 'relative',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}
            <button
              onClick={cerrarModal}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'none', border: 'none', color: '#94A3B8',
                cursor: 'pointer', padding: '4px', display: 'flex',
              }}
            >
              <X size={20} />
            </button>

            {/* Encabezado */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <Sparkles size={20} style={{ color: '#1E3A8A' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  Transcripción de la Llamada
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                Grabación #{transcriptModal.grabacion?.id_grabacion} · Llamada #{transcriptModal.grabacion?.id_llamada}
              </p>
            </div>

            {/* Contenido de transcripción */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '1rem',
              backgroundColor: '#F8FAFC', borderRadius: '12px',
              border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.85rem',
              minHeight: '260px',
            }}>
              {transcriptModal.loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                  <RefreshCw size={24} style={{ margin: '0 auto 0.5rem', animation: 'spin 1s linear infinite' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Cargando transcripción guardada...</p>
                </div>
              ) : !transcriptModal.transcripcion || transcriptModal.transcripcion.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
                  <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No se registró transcripción para esta llamada</p>
                </div>
              ) : (
                transcriptModal.transcripcion.map((dialogo, idx) => {
                  const isAgent = dialogo.emisor === 'Agente'
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isAgent ? '#1D4ED8' : '#D97706' }}>
                          {dialogo.emisor || 'Interlocutor'}
                        </span>
                        {dialogo.tiempo && (
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>[{dialogo.tiempo}]</span>
                        )}
                      </div>

                      <div
                        style={{
                          maxWidth: '90%',
                          padding: '0.65rem 0.9rem',
                          borderRadius: '12px',
                          backgroundColor: isAgent ? '#EFF6FF' : '#FFFFFF',
                          border: `1px solid ${isAgent ? '#BFDBFE' : '#CBD5E1'}`,
                          color: '#1E293B',
                          fontSize: '0.85rem',
                          lineHeight: 1.45,
                        }}
                      >
                        {dialogo.texto}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pie del modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                onClick={cerrarModal}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '8px',
                  backgroundColor: '#1E3A8A', color: '#FFFFFF',
                  fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', border: 'none',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
