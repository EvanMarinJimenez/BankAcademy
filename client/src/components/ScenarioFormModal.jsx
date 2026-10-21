import { useState, useEffect } from 'react'
import { X, BookOpen, Tag, Settings, Calendar, AlertCircle } from 'lucide-react'

const TIPOS = [
  { value: 'llamada', label: 'Llamada telefónica' },
  { value: 'chat', label: 'Chat en vivo' },
  { value: 'mixto', label: 'Mixto (llamada + chat)' },
]

const MODALIDADES = [
  { value: 'individual', label: 'Individual' },
  { value: 'grupal', label: 'Grupal' },
]

const ESTADOS = [
  { value: 'activa', label: 'Activa' },
  { value: 'inactiva', label: 'Inactiva' },
  { value: 'programada', label: 'Programada' },
]

export default function ScenarioFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  scenario = null,
  onClose,
  onSuccess,
}) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('llamada')
  const [modalidad, setModalidad] = useState('individual')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [estado, setEstado] = useState('activa')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (scenario && mode === 'edit') {
      setNombre(scenario.nombre || '')
      setDescripcion(scenario.descripcion || '')
      setTipo(scenario.tipo || 'llamada')
      setModalidad(scenario.modalidad || 'individual')
      setFechaInicio(scenario.fecha_inicio ? scenario.fecha_inicio.slice(0, 16) : '')
      setFechaFin(scenario.fecha_fin ? scenario.fecha_fin.slice(0, 16) : '')
      setEstado(scenario.estado || 'activa')
    } else {
      setNombre('')
      setDescripcion('')
      setTipo('llamada')
      setModalidad('individual')
      setFechaInicio('')
      setFechaFin('')
      setEstado('activa')
    }
    setError('')
  }, [scenario, mode, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre del escenario es obligatorio.')
      return
    }

    setLoading(true)
    try {
      const url = mode === 'create'
        ? 'http://localhost:3000/api/simulaciones'
        : `http://localhost:3000/api/simulaciones/${scenario.id_simulacion}`

      const method = mode === 'create' ? 'POST' : 'PUT'

      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tipo,
        modalidad,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        ...(mode === 'edit' ? { estado } : {}),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar la solicitud')

      onSuccess(data.simulacion)
      onClose()
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const isEdit = mode === 'edit'

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem 0.625rem 2.5rem',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.35rem',
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '580px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          padding: '2rem',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute', top: '1.25rem', right: '1.25rem',
            background: 'none', border: 'none', color: '#94A3B8',
            cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex',
          }}
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
            {isEdit ? 'Editar Escenario' : 'Nuevo Escenario de Llamada'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            {isEdit
              ? 'Modifica los parámetros del escenario de simulación.'
              : 'Define los detalles del escenario que usarán los participantes.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.75rem 1rem', backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5', borderRadius: '8px',
            color: '#B91C1C', fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nombre */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nombre del escenario *</label>
            <div style={{ position: 'relative' }}>
              <BookOpen size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Reclamo por cargo no reconocido"
                disabled={loading}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el contexto del escenario, el perfil del cliente simulado y el objetivo del participante..."
              disabled={loading}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Tipo y Modalidad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Tipo de simulación *</label>
              <div style={{ position: 'relative' }}>
                <Tag size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  disabled={loading}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Modalidad</label>
              <div style={{ position: 'relative' }}>
                <Settings size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                  disabled={loading}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {MODALIDADES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Fecha y hora de inicio</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  disabled={loading}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Fecha y hora de fin</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="datetime-local"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  min={fechaInicio}
                  disabled={loading}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Estado</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ESTADOS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEstado(e.value)}
                    disabled={loading}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${estado === e.value ? '#1E3A8A' : '#CBD5E1'}`,
                      backgroundColor: estado === e.value ? '#EFF6FF' : '#FFFFFF',
                      color: estado === e.value ? '#1E3A8A' : '#64748B',
                      fontSize: '0.8rem',
                      fontWeight: estado === e.value ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: '8px',
                border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF',
                color: '#475569', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.625rem 1.5rem', borderRadius: '8px',
                border: 'none', backgroundColor: '#1E3A8A',
                color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(30,58,138,0.25)',
              }}
            >
              {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Escenario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
