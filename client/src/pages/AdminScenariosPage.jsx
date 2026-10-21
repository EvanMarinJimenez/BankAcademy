import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../components/AdminLayout'
import ScenarioFormModal from '../components/ScenarioFormModal'
import ConfirmModal from '../components/ConfirmModal'
import {
  Plus, Search, Phone, MessageCircle, Layers,
  Edit2, XCircle, RefreshCw, Filter,
  CheckCircle2, Clock
} from 'lucide-react'

const API = 'http://localhost:3000/api/simulaciones'

const TIPO_CONFIG = {
  llamada: { label: 'Llamada', icon: Phone, color: '#DBEAFE', iconColor: '#1D4ED8' },
  chat: { label: 'Chat', icon: MessageCircle, color: '#EDE9FE', iconColor: '#6D28D9' },
  mixto: { label: 'Mixto', icon: Layers, color: '#FEF3C7', iconColor: '#D97706' },
}

const ESTADO_CONFIG = {
  activa: { label: 'Activa', bg: '#D1FAE5', color: '#065F46' },
  inactiva: { label: 'Inactiva', bg: '#F1F5F9', color: '#475569' },
  programada: { label: 'Programada', bg: '#DBEAFE', color: '#1E40AF' },
  cancelada: { label: 'Cancelada', bg: '#FEE2E2', color: '#B91C1C' },
  finalizada: { label: 'Finalizada', bg: '#F0FDF4', color: '#15803D' },
}

function Badge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, bg: '#F1F5F9', color: '#475569' }
  return (
    <span
      style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '0.25rem 0.65rem',
        borderRadius: '999px',
        backgroundColor: cfg.bg,
        color: cfg.color,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {cfg.label}
    </span>
  )
}

function TipoIcon({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.llamada
  const Icon = cfg.icon
  return (
    <div
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '8px',
        backgroundColor: cfg.color,
        color: cfg.iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={18} />
    </div>
  )
}

function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminScenariosPage() {
  const [simulaciones, setSimulaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')

  // Modales HUL01 + HUL02
  const [formModal, setFormModal] = useState({ isOpen: false, mode: 'create', scenario: null })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, scenario: null })

  const fetchSimulaciones = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterTipo !== 'all') params.append('tipo', filterTipo)
      if (filterEstado !== 'all') params.append('estado', filterEstado)
      if (search.trim()) params.append('search', search.trim())

      const res = await fetch(`${API}?${params}`)
      const data = await res.json()
      if (res.ok) setSimulaciones(data.simulaciones || [])
    } catch (err) {
      console.error('Error cargando escenarios:', err)
    } finally {
      setLoading(false)
    }
  }, [filterTipo, filterEstado, search])

  useEffect(() => {
    const timeout = setTimeout(fetchSimulaciones, 300)
    return () => clearTimeout(timeout)
  }, [fetchSimulaciones])

  const handleDesactivar = async () => {
    const { scenario } = confirmModal
    if (!scenario) return
    try {
      const nuevoEstado = scenario.estado === 'inactiva' ? 'activa' : 'inactiva'
      await fetch(`${API}/${scenario.id_simulacion}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      setConfirmModal({ isOpen: false, scenario: null })
      fetchSimulaciones()
    } catch (err) {
      console.error('Error al cambiar estado:', err)
    }
  }

  const totalActivos = simulaciones.filter((s) => s.estado === 'activa').length
  const totalProgramados = simulaciones.filter((s) => s.estado === 'programada').length

  return (
    <AdminLayout pageTitle="Sprint 2" sectionTitle="Escenarios de Llamadas">
      <div style={{ padding: '0 2rem 2rem' }}>
        {/* KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            margin: '1.5rem 0',
          }}
        >
          {[
            { label: 'Total escenarios', value: simulaciones.length, icon: Layers, bg: '#EFF6FF', color: '#3B82F6' },
            { label: 'Activos', value: totalActivos, icon: CheckCircle2, bg: '#ECFDF5', color: '#10B981' },
            { label: 'Programados', value: totalProgramados, icon: Clock, bg: '#FEF3C7', color: '#D97706' },
          ].map((kpi) => {
            const Icon = kpi.icon
            return (
              <div
                key={kpi.label}
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.25rem 1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: kpi.bg,
                    color: kpi.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, fontWeight: 500 }}>
                    {kpi.label}
                  </p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0.1rem 0 0' }}>
                    {kpi.value}
                  </h3>
                </div>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1rem 1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          {/* Buscador */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              placeholder="Buscar escenario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filtro tipo */}
          <div style={{ position: 'relative' }}>
            <Filter
              size={14}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                pointerEvents: 'none',
              }}
            />
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem 0.5rem 1.8rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="all">Todos los tipos</option>
              <option value="llamada">Llamada</option>
              <option value="chat">Chat</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          {/* Filtro estado */}
          <div style={{ position: 'relative' }}>
            <Filter
              size={14}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
                pointerEvents: 'none',
              }}
            />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem 0.5rem 1.8rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
              <option value="programada">Programada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <button
            onClick={fetchSimulaciones}
            title="Recargar"
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#64748B',
            }}
          >
            <RefreshCw size={16} />
          </button>

          {/* Botón crear */}
          <button
            onClick={() => setFormModal({ isOpen: true, mode: 'create', scenario: null })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              backgroundColor: '#1E3A8A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(30,58,138,0.2)',
              marginLeft: 'auto',
            }}
          >
            <Plus size={17} />
            Nuevo escenario
          </button>
        </div>

        {/* Tabla de escenarios */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
              <RefreshCw size={28} style={{ margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
              <p style={{ margin: 0 }}>Cargando escenarios...</p>
            </div>
          ) : simulaciones.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94A3B8' }}>
              <Layers size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron escenarios</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
                {search || filterTipo !== 'all' || filterEstado !== 'all'
                  ? 'Intenta con otros filtros.'
                  : 'Crea el primer escenario con el botón "Nuevo escenario".'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Escenario', 'Tipo', 'Modalidad', 'Fecha inicio', 'Estado', 'Acciones'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simulaciones.map((sim, i) => (
                    <tr
                      key={sim.id_simulacion}
                      style={{
                        borderBottom: i < simulaciones.length - 1 ? '1px solid #F1F5F9' : 'none',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Nombre */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <TipoIcon tipo={sim.tipo} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>{sim.nombre}</p>
                            {sim.descripcion && (
                              <p
                                style={{
                                  margin: '0.15rem 0 0',
                                  fontSize: '0.78rem',
                                  color: '#94A3B8',
                                  maxWidth: '280px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {sim.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Tipo */}
                      <td style={{ padding: '0.9rem 1rem', color: '#475569' }}>
                        {TIPO_CONFIG[sim.tipo]?.label || sim.tipo}
                      </td>
                      {/* Modalidad */}
                      <td style={{ padding: '0.9rem 1rem', color: '#475569', textTransform: 'capitalize' }}>
                        {sim.modalidad || '—'}
                      </td>
                      {/* Fecha inicio */}
                      <td style={{ padding: '0.9rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {formatFecha(sim.fecha_inicio)}
                      </td>
                      {/* Estado */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <Badge estado={sim.estado} />
                      </td>
                      {/* Acciones (HUL02) */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => setFormModal({ isOpen: true, mode: 'edit', scenario: sim })}
                            title="Editar escenario"
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#475569',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#EFF6FF'
                              e.currentTarget.style.color = '#1D4ED8'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FFFFFF'
                              e.currentTarget.style.color = '#475569'
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, scenario: sim })}
                            title={sim.estado === 'inactiva' ? 'Activar' : 'Desactivar'}
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#475569',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#FEF2F2'
                              e.currentTarget.style.color = '#B91C1C'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FFFFFF'
                              e.currentTarget.style.color = '#475569'
                            }}
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modales HUL01 + HUL02 */}
      <ScenarioFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        scenario={formModal.scenario}
        onClose={() => setFormModal({ isOpen: false, mode: 'create', scenario: null })}
        onSuccess={() => fetchSimulaciones()}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.scenario?.estado === 'inactiva' ? 'Activar escenario' : 'Desactivar escenario'}
        message={
          confirmModal.scenario?.estado === 'inactiva'
            ? `¿Deseas activar el escenario "${confirmModal.scenario?.nombre}"? Los participantes podrán verlo nuevamente.`
            : `¿Deseas desactivar el escenario "${confirmModal.scenario?.nombre}"? Los participantes no podrán acceder a él.`
        }
        confirmText={confirmModal.scenario?.estado === 'inactiva' ? 'Activar' : 'Desactivar'}
        isDanger={confirmModal.scenario?.estado !== 'inactiva'}
        onConfirm={handleDesactivar}
        onCancel={() => setConfirmModal({ isOpen: false, scenario: null })}
      />
    </AdminLayout>
  )
}
