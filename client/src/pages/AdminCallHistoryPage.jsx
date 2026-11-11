import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, Phone, PhoneOff, PhoneMissed, Clock, Mic, FileText } from 'lucide-react'
import AdminLayout from '../components/AdminLayout'
import { urlGrabacion } from '../utils/grabaciones'

const ESTADOS = {
  finalizada: { label: 'Finalizada', bg: '#DCFCE7', color: '#166534' },
  en_curso: { label: 'En curso', bg: '#DBEAFE', color: '#1E40AF' },
  rechazada: { label: 'Rechazada', bg: '#FEE2E2', color: '#991B1B' },
  perdida: { label: 'Perdida', bg: '#FEF3C7', color: '#92400E' },
}

const formatSecs = (secs) => {
  if (!secs) return '—'
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

const formatFecha = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const celda = { padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9', fontSize: '0.82rem', color: '#1E293B', verticalAlign: 'top' }

export default function AdminCallHistoryPage() {
  const [llamadas, setLlamadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')

  const [recargas, setRecargas] = useState(0)

  useEffect(() => {
    fetch('/api/llamadas')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial')
        setLlamadas(data.llamadas)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [recargas])

  const actualizar = () => {
    setLoading(true)
    setRecargas((n) => n + 1)
  }

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return llamadas.filter((l) => {
      if (estado && l.estado !== estado) return false
      if (!q) return true
      const p = l.participante_llamada?.[0]?.profiles || {}
      return [l.simulacion?.nombre, `${p.first_name || ''} ${p.last_name || ''}`, p.email]
        .some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [llamadas, search, estado])

  const contar = (e) => llamadas.filter((l) => l.estado === e).length

  return (
    <AdminLayout pageTitle="Operación" sectionTitle="Historial de Llamadas">
      <div style={{ padding: '0 2rem 2rem' }}>

        <section className="stats-grid" style={{ margin: '1.5rem 0' }}>
          <article className="stat-card">
            <div className="stat-icon blue"><Phone size={22} /></div>
            <div><span>Total de llamadas</span><strong>{llamadas.length}</strong></div>
          </article>
          <article className="stat-card">
            <div className="stat-icon green"><Clock size={22} /></div>
            <div><span>Finalizadas</span><strong>{contar('finalizada')}</strong></div>
          </article>
          <article className="stat-card">
            <div className="stat-icon purple"><PhoneMissed size={22} /></div>
            <div><span>Rechazadas o perdidas</span><strong>{contar('rechazada') + contar('perdida')}</strong></div>
          </article>
        </section>

        {/* Filtros */}
        <div style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0',
          padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center',
          flexWrap: 'wrap', marginBottom: '1.5rem',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Buscar por participante o escenario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button
            onClick={actualizar}
            style={{ padding: '0.5rem 0.9rem', border: '1px solid #CBD5E1', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#1E3A8A', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#64748B' }}>Cargando historial...</p>
        ) : error ? (
          <p style={{ color: '#DC2626', fontWeight: 600 }}>{error}</p>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8' }}>
            <PhoneOff size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No hay llamadas que coincidan con los filtros.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  {['Fecha', 'Participante', 'Escenario', 'Estado', 'Duración', 'Notas del evaluador', 'Grabación'].map((h) => (
                    <th key={h} style={{ ...celda, fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((l) => {
                  const p = l.participante_llamada?.[0]?.profiles
                  const est = ESTADOS[l.estado] || { label: l.estado, bg: '#F1F5F9', color: '#475569' }
                  return (
                    <tr key={l.id_llamada}>
                      <td style={celda}>
                        {formatFecha(l.fecha_inicio)}
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Llamada #{l.id_llamada}</div>
                      </td>
                      <td style={celda}>
                        {p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email : '—'}
                        {p?.email && <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{p.email}</div>}
                      </td>
                      <td style={celda}>{l.simulacion?.nombre || '—'}</td>
                      <td style={celda}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px', backgroundColor: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </td>
                      <td style={celda}>{formatSecs(l.duracion)}</td>
                      <td style={{ ...celda, maxWidth: '260px', whiteSpace: 'pre-wrap', color: l.notas_admin ? '#1E293B' : '#94A3B8' }}>
                        {l.notas_admin || 'Sin notas'}
                      </td>
                      <td style={{ ...celda, minWidth: '240px' }}>
                        {l.grabacion ? (
                          <audio controls preload="none" src={urlGrabacion(l.grabacion.url_archivo)} style={{ width: '100%', height: '34px' }} />
                        ) : (
                          <span style={{ color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Mic size={13} /> Sin grabación
                          </span>
                        )}
                        {l.transcripcion && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FileText size={12} /> Con transcripción (ver en Grabaciones)
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
