import { useEffect, useMemo, useState } from 'react'
import {
  X, BookOpen, Tag, Settings, Calendar, AlertCircle,
  Clock, Sliders, Award, AlertTriangle, ShieldCheck, Users, Search
} from 'lucide-react'

const API_USERS = '/api/users'
const API_SIMULACIONES = '/api/simulaciones'

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
  { value: 'programada', label: 'Programada' },
  { value: 'inactiva', label: 'Inactiva' },
]

const DIFICULTADES = [
  { value: 'baja', label: 'Baja (Principiante)' },
  { value: 'media', label: 'Media (Intermedio)' },
  { value: 'alta', label: 'Alta (Avanzado)' },
]

const TONOS_CLIENTE = [
  { value: 'amable', label: 'Amable / Receptivo' },
  { value: 'normal', label: 'Neutral / Estándar' },
  { value: 'exigente', label: 'Exigente / Apurado' },
  { value: 'inconforme', label: 'Inconforme / Molesto' },
  { value: 'confundido', label: 'Confundido / Adulto mayor' },
]

const ANTICIPACIONES = [
  { value: 1, label: '1 hora antes' },
  { value: 24, label: '1 día antes' },
  { value: 72, label: '3 días antes' },
]

function getInitialFormState(scenario, mode) {
  const params = scenario?.parametros || {}

  if (scenario && mode === 'edit') {
    return {
      nombre: scenario.nombre || '',
      descripcion: scenario.descripcion || '',
      tipo: scenario.tipo || 'llamada',
      modalidad: scenario.modalidad || 'individual',
      fechaInicio: scenario.fecha_inicio ? scenario.fecha_inicio.slice(0, 16) : '',
      fechaFin: scenario.fecha_fin ? scenario.fecha_fin.slice(0, 16) : '',
      estado: scenario.estado || 'activa',
      // Parámetros
      duracionMinutos: params.duracion_minutos ?? 10,
      dificultad: params.dificultad || 'media',
      intentosMax: params.intentos_max ?? 2,
      umbralAprobacion: params.umbral_aprobacion ?? 70,
      tonoCliente: params.tono_cliente || 'normal',
      // Recordatorio
      recordatorioActivo: params.recordatorio?.activo ?? false,
      recordatorioHoras: params.recordatorio?.horas_antes ?? 24,
    }
  }

  return {
    nombre: '',
    descripcion: '',
    tipo: 'llamada',
    modalidad: 'individual',
    fechaInicio: '',
    fechaFin: '',
    estado: 'activa',
    // Parámetros
    duracionMinutos: 10,
    dificultad: 'media',
    intentosMax: 2,
    umbralAprobacion: 70,
    tonoCliente: 'normal',
    // Recordatorio
    recordatorioActivo: true,
    recordatorioHoras: 24,
  }
}

export default function ScenarioFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  scenario = null,
  onClose,
  onSuccess,
}) {
  const initialState = getInitialFormState(scenario, mode)

  const [nombre, setNombre] = useState(initialState.nombre)
  const [descripcion, setDescripcion] = useState(initialState.descripcion)
  const [tipo, setTipo] = useState(initialState.tipo)
  const [modalidad, setModalidad] = useState(initialState.modalidad)
  const [fechaInicio, setFechaInicio] = useState(initialState.fechaInicio)
  const [fechaFin, setFechaFin] = useState(initialState.fechaFin)
  const [estado, setEstado] = useState(initialState.estado)

  // Parámetros
  const [duracionMinutos, setDuracionMinutos] = useState(initialState.duracionMinutos)
  const [dificultad, setDificultad] = useState(initialState.dificultad)
  const [intentosMax, setIntentosMax] = useState(initialState.intentosMax)
  const [umbralAprobacion, setUmbralAprobacion] = useState(initialState.umbralAprobacion)
  const [tonoCliente, setTonoCliente] = useState(initialState.tonoCliente)

  // Recordatorio
  const [recordatorioActivo, setRecordatorioActivo] = useState(initialState.recordatorioActivo)
  const [recordatorioHoras, setRecordatorioHoras] = useState(initialState.recordatorioHoras)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Participantes del escenario
  const [usuarios, setUsuarios] = useState([])
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [participantesCargados, setParticipantesCargados] = useState(false)
  const [errorParticipantes, setErrorParticipantes] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const idEscenario = mode === 'edit' ? scenario?.id_simulacion : null

  useEffect(() => {
    if (!isOpen) return undefined
    let activo = true

    const cargarParticipantes = async () => {
      try {
        const peticiones = [fetch(`${API_USERS}?role=participant`)]
        if (idEscenario) peticiones.push(fetch(`${API_SIMULACIONES}/${idEscenario}`))

        const [resUsuarios, resEscenario] = await Promise.all(peticiones)
        const dataUsuarios = await resUsuarios.json()
        if (!resUsuarios.ok) throw new Error(dataUsuarios.error)

        const dataEscenario = resEscenario ? await resEscenario.json() : null
        if (resEscenario && !resEscenario.ok) throw new Error(dataEscenario.error)
        if (!activo) return

        const asignados = dataEscenario?.simulacion?.participante_simulacion || []
        setUsuarios(dataUsuarios.users || [])
        setSeleccionados(new Set(asignados.map((p) => p.profile_id)))
        setParticipantesCargados(true)
      } catch (err) {
        if (activo) setErrorParticipantes(err.message || 'No se pudieron cargar los participantes.')
      }
    }

    cargarParticipantes()
    return () => {
      activo = false
    }
  }, [isOpen, idEscenario])

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return usuarios
    return usuarios.filter((u) =>
      `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase().includes(texto)
    )
  }, [usuarios, busqueda])

  if (!isOpen) return null

  const alternarParticipante = (id) => {
    setSeleccionados((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(id)) siguientes.delete(id)
      else siguientes.add(id)
      return siguientes
    })
  }

  const todosFiltradosSeleccionados =
    usuariosFiltrados.length > 0 && usuariosFiltrados.every((u) => seleccionados.has(u.id))

  const alternarTodos = () => {
    setSeleccionados((actuales) => {
      const siguientes = new Set(actuales)
      usuariosFiltrados.forEach((u) => {
        if (todosFiltradosSeleccionados) siguientes.delete(u.id)
        else siguientes.add(u.id)
      })
      return siguientes
    })
  }

  // Si cambia la fecha de inicio a futuro al crear, sugerir estado 'programada'
  const handleFechaInicioChange = (e) => {
    const val = e.target.value
    setFechaInicio(val)
    if (val && mode === 'create') {
      const selected = new Date(val)
      if (!isNaN(selected.getTime()) && selected > new Date()) {
        setEstado('programada')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre del escenario es obligatorio.')
      return
    }

    if (duracionMinutos <= 0) {
      setError('La duración debe ser mayor a 0 minutos.')
      return
    }

    setLoading(true)
    try {
      const url = mode === 'create'
        ? '/api/simulaciones'
        : `/api/simulaciones/${scenario.id_simulacion}`

      const method = mode === 'create' ? 'POST' : 'PUT'

      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tipo,
        modalidad,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        estado,
        // Parámetros estructurados
        parametros: {
          duracion_minutos: Number(duracionMinutos),
          dificultad,
          intentos_max: Number(intentosMax),
          umbral_aprobacion: Number(umbralAprobacion),
          tono_cliente: tonoCliente,
          // Recordatorio automático
          recordatorio: {
            activo: recordatorioActivo,
            horas_antes: Number(recordatorioHoras),
          },
        },
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar la solicitud')

      // El escenario ya está guardado: si esto falla, se avisa en vez de reintentar el
      // formulario, que crearía un duplicado. Sin la lista cargada no se toca lo asignado.
      let advertencia = ''
      if (participantesCargados && (mode === 'edit' || seleccionados.size > 0)) {
        try {
          const resAsignacion = await fetch(`${API_SIMULACIONES}/${data.simulacion.id_simulacion}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile_ids: Array.from(seleccionados) }),
          })
          if (!resAsignacion.ok) throw new Error()
        } catch {
          advertencia = `El escenario "${data.simulacion.nombre}" se guardó, pero no se pudieron actualizar sus participantes. Inténtalo desde el botón Asignar participantes de la tabla.`
        }
      }

      onSuccess(data.simulacion, advertencia)
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
          maxWidth: '640px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          padding: '2rem',
          position: 'relative',
          maxHeight: '92vh',
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
            {isEdit ? 'Editar Escenario de Simulación' : 'Nuevo Escenario de Simulación'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            {isEdit
              ? 'Modifica los parámetros y la programación del escenario.'
              : 'Define la configuración, parámetros de evaluación y programación para los participantes.'}
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
            <label style={labelStyle}>Descripción y contexto</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el contexto de la simulación, antecedentes del cliente bancario y el objetivo del participante..."
              disabled={loading}
              rows={2}
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

          {/* PARÁMETROS DE SIMULACIÓN */}
          <div style={{
            margin: '1.25rem 0',
            padding: '1.15rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Sliders size={18} style={{ color: '#1E3A8A' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Configuración de Parámetros
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
              {/* Duración */}
              <div>
                <label style={labelStyle}>Duración estimada (minutos) *</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={duracionMinutos}
                    onChange={(e) => setDuracionMinutos(e.target.value)}
                    disabled={loading}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Dificultad */}
              <div>
                <label style={labelStyle}>Nivel de dificultad *</label>
                <div style={{ position: 'relative' }}>
                  <AlertTriangle size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                  <select
                    value={dificultad}
                    onChange={(e) => setDificultad(e.target.value)}
                    disabled={loading}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {DIFICULTADES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
              {/* Intentos permitidos */}
              <div>
                <label style={{ ...labelStyle, fontSize: '0.8rem' }}>Intentos permitidos</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={intentosMax}
                  onChange={(e) => setIntentosMax(e.target.value)}
                  disabled={loading}
                  style={{ ...inputStyle, paddingLeft: '0.75rem' }}
                />
              </div>

              {/* Umbral aprobación */}
              <div>
                <label style={{ ...labelStyle, fontSize: '0.8rem' }}>Nota mínima (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={umbralAprobacion}
                  onChange={(e) => setUmbralAprobacion(e.target.value)}
                  disabled={loading}
                  style={{ ...inputStyle, paddingLeft: '0.75rem' }}
                />
              </div>

              {/* Tono del cliente */}
              <div>
                <label style={{ ...labelStyle, fontSize: '0.8rem' }}>Tono del cliente</label>
                <select
                  value={tonoCliente}
                  onChange={(e) => setTonoCliente(e.target.value)}
                  disabled={loading}
                  style={{ ...inputStyle, paddingLeft: '0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {TONOS_CLIENTE.map((tc) => (
                    <option key={tc.value} value={tc.value}>{tc.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* PROGRAMACIÓN Y FECHAS */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <Calendar size={18} style={{ color: '#1E3A8A' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Programación de la Simulación
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Fecha y hora de inicio</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                  <input
                    type="datetime-local"
                    value={fechaInicio}
                    onChange={handleFechaInicioChange}
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

            {/* Selector de estado (Activa / Programada / Inactiva) */}
            <div>
              <label style={labelStyle}>Estado del escenario</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ESTADOS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEstado(e.value)}
                    disabled={loading}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${estado === e.value ? '#1E3A8A' : '#CBD5E1'}`,
                      backgroundColor: estado === e.value ? '#EFF6FF' : '#FFFFFF',
                      color: estado === e.value ? '#1E3A8A' : '#64748B',
                      fontSize: '0.8rem',
                      fontWeight: estado === e.value ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {e.value === 'programada' && <Clock size={13} />}
                    {e.value === 'activa' && <ShieldCheck size={13} />}
                    {e.label}
                  </button>
                ))}
              </div>
              {estado === 'programada' && (
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#1E40AF', fontWeight: 500 }}>
                  ℹ️ El escenario estará en estado Programado hasta que llegue su fecha de inicio.
                </p>
              )}

              {/* Recordatorio automático */}
              {estado === 'programada' && (
                <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={recordatorioActivo}
                      onChange={(e) => setRecordatorioActivo(e.target.checked)}
                      disabled={loading}
                    />
                    Enviar recordatorio a los participantes
                  </label>
                  {recordatorioActivo && (
                    <select
                      aria-label="Anticipación del recordatorio"
                      value={recordatorioHoras}
                      onChange={(e) => setRecordatorioHoras(e.target.value)}
                      disabled={loading}
                      style={{ padding: '0.4rem 0.6rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#FFFFFF' }}
                    >
                      {ANTICIPACIONES.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  )}
                  {recordatorioActivo && !fechaInicio && (
                    <p style={{ margin: 0, width: '100%', fontSize: '0.78rem', color: '#B45309', fontWeight: 500 }}>
                      Define una fecha de inicio para que se pueda enviar el recordatorio.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Participantes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <Users size={18} style={{ color: '#1E3A8A' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Participantes ({seleccionados.size} seleccionados)
              </h3>
            </div>

            {errorParticipantes ? (
              <p role="alert" style={{ margin: 0, fontSize: '0.85rem', color: '#B91C1C' }}>
                No se pudo cargar la lista de participantes. {isEdit
                  ? 'Las asignaciones actuales no se modificarán.'
                  : 'Puedes crear el escenario y asignarlos después desde la tabla.'}
              </p>
            ) : !participantesCargados ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>Cargando participantes...</p>
            ) : usuarios.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>No hay participantes registrados.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      aria-label="Buscar participante"
                      placeholder="Buscar por nombre o correo..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                      disabled={loading}
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={alternarTodos}
                    disabled={loading || usuariosFiltrados.length === 0}
                    style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {todosFiltradosSeleccionados ? 'Quitar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div style={{ maxHeight: '170px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  {usuariosFiltrados.length === 0 ? (
                    <p style={{ margin: 0, padding: '0.75rem', fontSize: '0.85rem', color: '#64748B' }}>Sin resultados.</p>
                  ) : (
                    usuariosFiltrados.map((u) => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={seleccionados.has(u.id)}
                          onChange={() => alternarParticipante(u.id)}
                          disabled={loading}
                        />
                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                            {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>{u.email}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </>
            )}

            {estado === 'programada' && recordatorioActivo && participantesCargados && seleccionados.size === 0 && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#B45309', fontWeight: 500 }}>
                Selecciona al menos un participante para que alguien reciba el recordatorio.
              </p>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
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
              {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : (estado === 'programada' ? 'Programar Simulación' : 'Crear Escenario'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
