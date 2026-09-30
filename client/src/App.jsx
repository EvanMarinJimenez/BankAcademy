import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const socket = io()

export default function App() {
  const [status, setStatus] = useState('...')
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus('error'))

    socket.on('mensaje', (m) => setMensajes((prev) => [...prev, m]))
    return () => socket.off('mensaje')
  }, [])

  const enviar = () => {
    if (!texto.trim()) return
    socket.emit('mensaje', texto)
    setTexto('')
  }

  return (
    <main>
      <h1>API: {status}</h1>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} />
      <button onClick={enviar}>Enviar</button>
      <ul>{mensajes.map((m, i) => <li key={i}>{m}</li>)}</ul>
    </main>
  )
}