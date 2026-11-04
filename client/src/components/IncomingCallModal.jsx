import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, PhoneOff } from 'lucide-react'

/**
 * IncomingCallModal
 * Aparece cuando el servidor emite 'llamada:entrante' vía Socket.io.
 *
 * Props:
 *   llamada  — { id_llamada, simulacion: { nombre, descripcion, ... } }
 *   onAccept — callback llamado al aceptar (redirige a /llamada/:id)
 *   onReject — callback llamado al rechazar
 */
export default function IncomingCallModal({ llamada, onAccept, onReject }) {
  const navigate = useNavigate()

  // Bloquear scroll mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleAccept = () => {
    if (onAccept) onAccept()
    navigate(`/llamada/${llamada.id_llamada}`)
  }

  const handleReject = () => {
    if (onReject) onReject()
  }

  const nombreEscenario = llamada?.simulacion?.nombre || 'Simulación de llamada'

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Avatar animado */}
        <div style={styles.visualWrap}>
          <div style={styles.ring1} />
          <div style={styles.ring2} />
          <div style={styles.avatar}>
            <Phone size={36} color="#FFFFFF" />
          </div>
        </div>

        {/* Info */}
        <p style={styles.label}>Llamada entrante</p>
        <h2 style={styles.title}>{nombreEscenario}</h2>
        {llamada?.simulacion?.descripcion && (
          <p style={styles.desc}>{llamada.simulacion.descripcion}</p>
        )}

        {/* Acciones */}
        <div style={styles.actions}>
          <button style={styles.btnReject} onClick={handleReject}>
            <PhoneOff size={20} />
            <span>Rechazar</span>
          </button>

          <button style={styles.btnAccept} onClick={handleAccept}>
            <Phone size={20} />
            <span>Aceptar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Estilos inline para el modal (aislados del layout) ───── */
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    animation: 'slideUp 0.25s ease',
  },
  visualWrap: {
    position: 'relative',
    width: '110px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  ring1: {
    position: 'absolute',
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    border: '2px solid rgba(59, 130, 246, 0.35)',
    animation: 'ringPulse 2.2s ease-out infinite',
  },
  ring2: {
    position: 'absolute',
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    border: '2px solid rgba(59, 130, 246, 0.35)',
    animation: 'ringPulse 2.2s ease-out 1.1s infinite',
  },
  avatar: {
    width: '78px',
    height: '78px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 0.4rem',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#1E293B',
    margin: '0 0 0.5rem',
    lineHeight: 1.3,
  },
  desc: {
    fontSize: '0.85rem',
    color: '#64748B',
    margin: '0 0 1.75rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  btnReject: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  btnAccept: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#22C55E',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
}

