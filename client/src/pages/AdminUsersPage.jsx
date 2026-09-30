import { useState, useEffect, useMemo } from 'react'
import AdminLayout from '../components/AdminLayout'
import ConfirmModal from '../components/ConfirmModal'
import UserFormModal from '../components/UserFormModal'
import { supabase } from '../lib/supabase'
import {
  UserPlus, Search, Pencil, UserX, UserCheck, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Shield
} from 'lucide-react'
import '../styles/admin-users.css'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [formMode, setFormMode] = useState('create') // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null)

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [statusToggleLoading, setStatusToggleLoading] = useState(false)

  // Toast feedback
  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: '' }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Fetch users from server API or Supabase
  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        // Fallback directly to Supabase client
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error loading users:', err)
      // Direct supabase query fallback
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Filter by status
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false

      // Filter by search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
        const email = (u.email || '').toLowerCase()
        return fullName.includes(q) || email.includes(q)
      }

      return true
    })
  }, [users, search, statusFilter])

  // Handlers
  const handleOpenCreate = () => {
    setSelectedUser(null)
    setFormMode('create')
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (user) => {
    setSelectedUser(user)
    setFormMode('edit')
    setIsFormModalOpen(true)
  }

  const handleOpenToggleStatus = (user) => {
    setSelectedUser(user)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmToggleStatus = async () => {
    if (!selectedUser) return
    setStatusToggleLoading(true)

    const newStatus = !selectedUser.is_active

    try {
      // 1. Try server endpoint
      const res = await fetch(`http://localhost:3000/api/users/${selectedUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      })

      if (res.ok) {
        showToast(`Usuario ${newStatus ? 'activado' : 'desactivado'} con éxito.`)
      } else {
        // Fallback direct supabase
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: newStatus })
          .eq('id', selectedUser.id)

        if (error) throw error
        showToast(`Usuario ${newStatus ? 'activado' : 'desactivado'} con éxito.`)
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, is_active: newStatus } : u))
      )
      setIsConfirmModalOpen(false)
    } catch (err) {
      showToast(err.message || 'Error al actualizar el estado del usuario', 'error')
    } finally {
      setStatusToggleLoading(false)
    }
  }

  const handleFormSuccess = (updatedUser) => {
    showToast(
      formMode === 'create'
        ? '¡Participante registrado exitosamente!'
        : '¡Datos del usuario actualizados correctamente!'
    )
    loadUsers()
  }

  const getInitials = (u) => {
    const f = u.first_name?.[0] || ''
    const l = u.last_name?.[0] || ''
    return (f + l).toUpperCase() || 'US'
  }

  const formatDate = (isoString) => {
    if (!isoString) return 'Sin actividad'
    const date = new Date(isoString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <AdminLayout pageTitle="Administración" sectionTitle="Usuarios">
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            margin: '1rem 2rem 0',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            color: toast.type === 'error' ? '#991B1B' : '#065F46',
            border: `1px solid ${toast.type === 'error' ? '#F87171' : '#34D399'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Encabezado de sección */}
      <section className="page-intro">
        <div>
          <h2>Gestión de participantes</h2>
          <p>
            Registra, consulta, modifica y administra el estado de los participantes de la plataforma.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-primary"
          style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} />
          <span>Registrar participante</span>
        </button>
      </section>

      {/* Filtros */}
      <section className="filters-card">
        <div className="search-box">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar por nombre o correo electrónico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar participante"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Estado</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </section>

      {/* Tabla de usuarios */}
      <section className="users-section">
        <div className="section-header">
          <div>
            <h2>Participantes registrados</h2>
            <p>{filteredUsers.length} participantes encontrados</p>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <p>Cargando participantes...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <p>No se encontraron participantes que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Correo electrónico</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha de registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="participant">
                        <div className="participant-avatar">
                          {getInitials(user)}
                        </div>
                        <div>
                          <strong>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'}</strong>
                          <span>ID: {user.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          backgroundColor: user.role === 'admin' ? '#EDE9FE' : '#E0F2FE',
                          color: user.role === 'admin' ? '#6D28D9' : '#0369A1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {user.role === 'admin' && <Shield size={12} />}
                        {user.role === 'admin' ? 'Administrador' : 'Participante'}
                      </span>
                    </td>

                    <td>
                      <span className={`status ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                        <span className="status-dot"></span>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td>{formatDate(user.created_at)}</td>

                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="action-btn"
                          title="Editar participante"
                          onClick={() => handleOpenEdit(user)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          type="button"
                          className={`action-btn ${user.is_active ? 'action-danger' : 'action-success'}`}
                          title={user.is_active ? 'Desactivar participante' : 'Activar participante'}
                          onClick={() => handleOpenToggleStatus(user)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        <div className="table-footer">
          <span>
            Mostrando {filteredUsers.length} de {users.length} participantes
          </span>

          <div className="pagination">
            <button type="button" className="pagination-btn disabled" aria-label="Página anterior">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="pagination-btn active">
              1
            </button>
            <button type="button" className="pagination-btn disabled" aria-label="Página siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal (HUU04) */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title={selectedUser?.is_active ? '¿Desactivar participante?' : '¿Activar participante?'}
        message={
          selectedUser?.is_active
            ? `El participante ${selectedUser?.first_name} ${selectedUser?.last_name} (${selectedUser?.email}) no podrá iniciar sesión en la plataforma ni participar en simulaciones mientras esté inactivo.`
            : `El participante ${selectedUser?.first_name} ${selectedUser?.last_name} volverá a tener acceso a su cuenta y a las simulaciones asignadas.`
        }
        confirmText={selectedUser?.is_active ? 'Sí, desactivar' : 'Sí, activar'}
        cancelText="Cancelar"
        isDanger={selectedUser?.is_active}
        loading={statusToggleLoading}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

      {/* User Form Modal (HUU02 & HUU03) */}
      <UserFormModal
        isOpen={isFormModalOpen}
        mode={formMode}
        user={selectedUser}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </AdminLayout>
  )
}
