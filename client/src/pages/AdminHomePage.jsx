import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'
import {
  Users, Phone, MessageCircle, Activity,
  ArrowRight, CheckCircle2, Clock, ShieldAlert,
  TrendingUp, Calendar, UserPlus, FileText
} from 'lucide-react'
import '../styles/admin-home.css'

export default function AdminHomePage() {
  const { profile } = useAuth()
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    fetch('http://localhost:3000/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUserCount(data.users.length)
      })
      .catch((err) => console.log('Error fetching stats:', err))
  }, [])

  const adminName = profile?.first_name || 'Administrador'

  return (
    <AdminLayout pageTitle="Panel Administrativo" sectionTitle="Resumen General">
      <div style={{ padding: '0 2rem 2rem' }}>
        {/* Banner de bienvenida */}
        <section
          style={{
            backgroundColor: '#1E3A8A',
            backgroundImage: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #3B82F6 100%)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem 2.5rem',
            margin: '1.5rem 0 2rem',
            boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          <div>
            <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8, fontWeight: 600 }}>
              Panel de Control
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0.35rem 0 0.5rem', color: '#FFFFFF' }}>
              Bienvenido, {adminName} 👋
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', maxWidth: '550px', lineHeight: '1.5' }}>
              Supervisa la actividad en tiempo real, gestiona a los participantes del programa de entrenamiento y coordina las simulaciones bancarias.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/admin/users"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#FFFFFF',
                color: '#1E3A8A',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            >
              <Users size={18} />
              <span>Gestionar Participantes</span>
            </Link>
          </div>
        </section>

        {/* Métricas clave */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="card-kpi" style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={26} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, fontWeight: 500 }}>Participantes Registrados</p>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1E293B', margin: '0.2rem 0 0' }}>{userCount || '—'}</h3>
            </div>
          </div>

          <div className="card-kpi" style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={26} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, fontWeight: 500 }}>Simulaciones Activas</p>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1E293B', margin: '0.2rem 0 0' }}>14</h3>
            </div>
          </div>

          <div className="card-kpi" style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={26} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, fontWeight: 500 }}>Llamadas Hoy</p>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1E293B', margin: '0.2rem 0 0' }}>48</h3>
            </div>
          </div>

          <div className="card-kpi" style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: '#EDE9FE', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={26} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, fontWeight: 500 }}>Calificación Promedio</p>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1E293B', margin: '0.2rem 0 0' }}>94.2%</h3>
            </div>
          </div>
        </div>

        {/* Secciones de actividad */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Actividad Reciente */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Simulaciones Recientes en Progreso
              </h2>
              <Link to="/admin/monitoring" style={{ fontSize: '0.875rem', color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>
                Ver todas →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#1E293B', display: 'block' }}>Llamada · Reclamo por cargo no reconocido</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Participante: María Rodríguez · Duración: 03:42</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                  En curso
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#EDE9FE', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#1E293B', display: 'block' }}>Chat · Solicitud de préstamo personal</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Participante: Carlos Méndez · Duración: 06:15</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', backgroundColor: '#D1FAE5', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                  En curso
                </span>
              </div>
            </div>
          </div>

          {/* Accesos Rápidos */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', marginBottom: '1.25rem' }}>
              Acciones Rápidas
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                to="/admin/users"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  color: '#1E293B',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.15s',
                }}
              >
                <UserPlus size={18} color="#3B82F6" />
                <span>Registrar nuevo participante</span>
              </Link>

              <Link
                to="/admin/reports"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  color: '#1E293B',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <FileText size={18} color="#10B981" />
                <span>Generar reporte de desempeño</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
