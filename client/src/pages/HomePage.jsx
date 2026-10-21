import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ParticipantNavbar from '../components/ParticipantNavbar'
import {
  PhoneCall, MessageSquare, Clock, Star, Phone, MessageCircle, ArrowRight, Layers, CheckCircle2
} from 'lucide-react'
import '../styles/home.css'

export default function HomePage() {
  const { profile } = useAuth()
  const [status, setStatus] = useState('available') // 'available' | 'busy' | 'offline'
  const [asignaciones, setAsignaciones] = useState([])
  const [loadingQueue, setLoadingQueue] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    let isMounted = true
    const fetchMisSimulaciones = async () => {
      setLoadingQueue(true)
      try {
        const res = await fetch(`http://localhost:3000/api/simulaciones/mis-simulaciones/${profile.id}`)
        const data = await res.json()
        if (res.ok && isMounted) {
          setAsignaciones(data.asignaciones || [])
        }
      } catch (err) {
        console.error('Error cargando simulaciones asignadas:', err)
      } finally {
        if (isMounted) setLoadingQueue(false)
      }
    }

    fetchMisSimulaciones()
    return () => {
      isMounted = false
    }
  }, [profile?.id])

  const firstName = profile?.first_name || 'Participante'

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ParticipantNavbar />

      <main className="main" style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="page-head">
          <div>
            <h1>Hola, {firstName} 👋</h1>
            <p>Este es tu panel para conectarte a las simulaciones de llamadas y chats.</p>
          </div>
        </div>

        {/* Selector de estado */}
        <section className="status-card">
          <div className="status-card__current">
            <span className={`status-dot status-dot--${status}`}></span>
            <div>
              <p className="status-card__label">Tu estado actual</p>
              <h2>
                {status === 'available' && 'Disponible'}
                {status === 'busy' && 'Ocupado'}
                {status === 'offline' && 'Desconectado'}
              </h2>
            </div>
          </div>

          <div className="status-options">
            <button
              className={`status-option ${status === 'available' ? 'status-option--active' : ''}`}
              onClick={() => setStatus('available')}
            >
              <span className="status-dot status-dot--available"></span>
              Disponible
            </button>
            <button
              className={`status-option ${status === 'busy' ? 'status-option--active' : ''}`}
              onClick={() => setStatus('busy')}
            >
              <span className="status-dot status-dot--busy"></span>
              Ocupado
            </button>
            <button
              className={`status-option ${status === 'offline' ? 'status-option--active' : ''}`}
              onClick={() => setStatus('offline')}
            >
              <span className="status-dot status-dot--offline"></span>
              Desconectado
            </button>
          </div>
        </section>

        {/* Métricas rápidas */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <PhoneCall size={24} />
            </div>
            <div>
              <p className="stat-card__value">8</p>
              <p className="stat-card__label">Llamadas simuladas hoy</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--secondary">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="stat-card__value">5</p>
              <p className="stat-card__label">Chats simulados hoy</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <Clock size={24} />
            </div>
            <div>
              <p className="stat-card__value">4:32</p>
              <p className="stat-card__label">Tiempo promedio de atención</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <Star size={24} />
            </div>
            <div>
              <p className="stat-card__value">92%</p>
              <p className="stat-card__label">Evaluación promedio</p>
            </div>
          </div>
        </section>

        {/* Cola de simulaciones */}
        <section className="queue-section">
          <div className="queue-section__head">
            <h3>Simulaciones asignadas</h3>
            <span className="queue-count">
              {loadingQueue
                ? 'Cargando...'
                : `${asignaciones.length} asignada${asignaciones.length === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="queue-list">
            {loadingQueue ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                <p style={{ margin: 0 }}>Cargando tus simulaciones...</p>
              </div>
            ) : asignaciones.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF4FF',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <h4 style={{ margin: '0 0 0.35rem', color: '#1E293B', fontSize: '1rem', fontWeight: 600 }}>
                  ¡Todo al día!
                </h4>
                <p style={{ margin: 0, color: '#64748B', fontSize: '0.875rem' }}>
                  No tienes simulaciones asignadas por el momento. Tu supervisor te asignará nuevas prácticas pronto.
                </p>
              </div>
            ) : (
              asignaciones.map((asig) => {
                const sim = asig.simulacion || {}
                const isChat = sim.tipo === 'chat'
                const isLlamada = sim.tipo === 'llamada'

                return (
                  <div key={asig.id_participante || sim.id_simulacion} className="queue-item">
                    <div
                      className={`queue-item__type ${
                        isChat ? 'queue-item__type--chat' : 'queue-item__type--call'
                      }`}
                    >
                      {isChat ? <MessageCircle size={20} /> : isLlamada ? <Phone size={20} /> : <Layers size={20} />}
                    </div>
                    <div className="queue-item__info">
                      <p className="queue-item__name">{sim.nombre || 'Simulación de práctica'}</p>
                      <p className="queue-item__meta">
                        {sim.descripcion ||
                          `${isChat ? 'Chat en vivo' : 'Llamada telefónica'} · Modalidad ${
                            sim.modalidad || 'individual'
                          }`}
                      </p>
                    </div>
                    <button className="btn-primary" style={{ padding: '0.55rem 1.15rem' }}>
                      {isChat ? 'Atender chat' : 'Atender llamada'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
