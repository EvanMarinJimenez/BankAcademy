import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const INTERVALO_MS = 60_000

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// avisos de recordatorio y cancelación para el participante.
export default function NotificationBell() {
  const { profile } = useAuth()
  const profileId = profile?.id
  const [notificaciones, setNotificaciones] = useState([])
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!profileId) return undefined
    let cancelado = false

    const cargar = async () => {
      const { data, error } = await supabase
        .from('notificacion')
        .select('id_notificacion, tipo, titulo, mensaje, leida, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cancelado) return
      if (error) {
        console.error('Error cargando notificaciones:', error.message)
        return
      }
      setNotificaciones(data)
    }

    cargar()
    const intervalo = setInterval(cargar, INTERVALO_MS)
    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
  }, [profileId])

  useEffect(() => {
    if (!abierto) return undefined
    const cerrarAlHacerClickFuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarAlHacerClickFuera)
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickFuera)
  }, [abierto])

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  const alternar = async () => {
    const abrir = !abierto
    setAbierto(abrir)
    if (!abrir || noLeidas === 0) return

    const { error } = await supabase
      .from('notificacion')
      .update({ leida: true })
      .eq('profile_id', profileId)
      .eq('leida', false)

    if (error) {
      console.error('Error marcando notificaciones:', error.message)
      return
    }
    setNotificaciones((actuales) => actuales.map((n) => ({ ...n, leida: true })))
  }

  return (
    <div ref={contenedorRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        onClick={alternar}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={abierto}
        title="Notificaciones"
      >
        <Bell size={20} />
        {noLeidas > 0 && <span className="icon-btn__dot"></span>}
      </button>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            width: 'min(320px, 85vw)',
            maxHeight: '360px',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            border: '1px solid #E2E8F0',
            padding: '0.5rem',
            zIndex: 1000,
          }}
        >
          {notificaciones.length === 0 ? (
            <p style={{ margin: 0, padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748B' }}>
              No tienes notificaciones.
            </p>
          ) : (
            notificaciones.map((n) => (
              <div key={n.id_notificacion} style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid #F1F5F9' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: n.tipo === 'cancelacion' ? '#B91C1C' : '#1E293B' }}>
                  {n.titulo}
                </p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#475569' }}>{n.mensaje}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8' }}>{formatearFecha(n.created_at)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
