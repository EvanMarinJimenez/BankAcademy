import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ParticipantNavbar from '../components/ParticipantNavbar'
import {
  PhoneCall, MessageSquare, Clock, Star, Phone, MessageCircle, ArrowRight
} from 'lucide-react'
import '../styles/home.css'

export default function HomePage() {
  const { profile } = useAuth()
  const [status, setStatus] = useState('available') // 'available' | 'busy' | 'offline'

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
            <h3>Simulaciones en cola</h3>
            <span className="queue-count">3 esperando</span>
          </div>

          <div className="queue-list">
            <div className="queue-item">
              <div className="queue-item__type queue-item__type--call">
                <Phone size={20} />
              </div>
              <div className="queue-item__info">
                <p className="queue-item__name">Simulación · Cliente María G.</p>
                <p className="queue-item__meta">Llamada entrante · Apertura de cuenta corriente</p>
              </div>
              <button className="btn-primary">
                Atender llamada
              </button>
            </div>

            <div className="queue-item">
              <div className="queue-item__type queue-item__type--chat">
                <MessageCircle size={20} />
              </div>
              <div className="queue-item__info">
                <p className="queue-item__name">Simulación · Cliente Carlos R.</p>
                <p className="queue-item__meta">Chat en vivo · Consulta de saldo y movimientos</p>
              </div>
              <button className="btn-primary">
                Atender chat
              </button>
            </div>

            <div className="queue-item">
              <div className="queue-item__type queue-item__type--call">
                <Phone size={20} />
              </div>
              <div className="queue-item__info">
                <p className="queue-item__name">Simulación · Cliente Lucía M.</p>
                <p className="queue-item__meta">Llamada entrante · Bloqueo de tarjeta por robo</p>
              </div>
              <button className="btn-primary">
                Atender llamada
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
