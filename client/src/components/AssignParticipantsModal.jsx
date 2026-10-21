import { useState, useEffect, useMemo } from 'react'
import { X, Search, Users, Check, AlertCircle, RefreshCw } from 'lucide-react'

const API_USERS = 'http://localhost:3000/api/users'
const API_SIMULACIONES = 'http://localhost:3000/api/simulaciones'

export default function AssignParticipantsModal({
  isOpen,
  scenario = null,
  onClose,
  onSuccess,
}) {
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !scenario) return

    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        // Cargar usuarios participantes y datos actuales de la simulación en paralelo
        const [usersRes, scenarioRes] = await Promise.all([
          fetch(`${API_USERS}?role=participant`),
          fetch(`${API_SIMULACIONES}/${scenario.id_simulacion}`),
        ])

        const usersData = await usersRes.json()
        const scenarioData = await scenarioRes.json()

        if (!isMounted) return

        if (!usersRes.ok) throw new Error(usersData.error || 'Error al cargar usuarios')

        const participantUsers = usersData.users || []
        setUsers(participantUsers)

        // Cargar participantes ya asignados
        if (scenarioRes.ok && scenarioData.simulacion?.participante_simulacion) {
          const assignedIds = new Set(
            scenarioData.simulacion.participante_simulacion.map((p) => p.profile_id)
          )
          setSelectedIds(assignedIds)
        } else {
          setSelectedIds(new Set())
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Error al inicializar datos')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    setSearch('')

    return () => {
      isMounted = false
    }
  }, [isOpen, scenario])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const query = search.toLowerCase()
    return users.filter(
      (u) =>
        (u.first_name && u.first_name.toLowerCase().includes(query)) ||
        (u.last_name && u.last_name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query))
    )
  }, [users, search])

  if (!isOpen || !scenario) return null

  const handleToggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredUsers.map((u) => u.id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      allFilteredIds.forEach((id) => next.add(id))
      return next
    })
  }

  const handleDeselectAll = () => {
    const allFilteredIds = new Set(filteredUsers.map((u) => u.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      allFilteredIds.forEach((id) => next.delete(id))
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_SIMULACIONES}/${scenario.id_simulacion}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_ids: Array.from(selectedIds) }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar asignaciones')

      if (onSuccess) onSuccess(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al guardar asignaciones')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          padding: '1.75rem',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
          }}
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#1E3A8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Asignar Participantes
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                Escenario: <strong style={{ color: '#1E293B' }}>{scenario.nombre}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Buscador y Controles rápidos */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
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
              placeholder="Buscar participante por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#64748B',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Ninguno
          </button>
        </div>

        {/* Info de selección */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            color: '#64748B',
            marginBottom: '0.5rem',
            padding: '0 0.25rem',
          }}
        >
          <span>
            {selectedIds.size} de {users.length} participante(s) seleccionado(s)
          </span>
          {search && <span>Mostrando {filteredUsers.length} resultado(s)</span>}
        </div>

        {/* Lista con scroll */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            minHeight: '220px',
            maxHeight: '340px',
          }}
        >
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>
              <RefreshCw
                size={24}
                style={{ margin: '0 auto 0.5rem', animation: 'spin 1s linear infinite' }}
              />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Cargando participantes...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>
              <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
                No se encontraron participantes
              </p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem' }}>
                {search ? 'Prueba con otro término de búsqueda.' : 'No hay usuarios participantes registrados.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user, idx) => {
              const isSelected = selectedIds.has(user.id)
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'
              const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '') || 'P'

              return (
                <div
                  key={user.id}
                  onClick={() => handleToggle(user.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 0.9rem',
                    borderBottom: idx < filteredUsers.length - 1 ? '1px solid #F1F5F9' : 'none',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                >
                  {/* Checkbox circular */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '5px',
                      border: `2px solid ${isSelected ? '#1E3A8A' : '#CBD5E1'}`,
                      backgroundColor: isSelected ? '#1E3A8A' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>

                  {/* Avatar con iniciales */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#DBEAFE',
                      color: '#1D4ED8',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {initials.toUpperCase()}
                  </div>

                  {/* Datos del usuario */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#1E293B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {fullName}
                      </p>
                      {!user.is_active && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: '#F1F5F9',
                            color: '#64748B',
                          }}
                        >
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user.email}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer / Botones */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            Los cambios se aplicarán inmediatamente.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                padding: '0.55rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1E3A8A',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(30,58,138,0.25)',
              }}
            >
              {saving ? 'Guardando...' : `Guardar (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
