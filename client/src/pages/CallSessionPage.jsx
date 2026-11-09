import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import {
  Mic, MicOff, Volume2, VolumeX, PhoneOff,
  Landmark, LogOut, Info, FileText, Send, Radio,
  CheckCircle2, Sparkles, Loader2
} from 'lucide-react'
import '../styles/llamada-usuario.css'

export default function CallSessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [llamada, setLlamada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingCall, setSavingCall] = useState(false)

  // Controles de llamada
  const [muted, setMuted] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [elapsed, setElapsed] = useState(0) // segundos
  const [notas, setNotas] = useState('')

  // ─── HUL08: Transcripción en tiempo real ──────────────────────────────────
  const [transcripciones, setTranscripciones] = useState([])
  const [interimText, setInterimText] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [activeTab, setActiveTab] = useState('transcription') // 'transcription' | 'checklist'
  const transcriptScrollRef = useRef(null)

  // ─── HUL09: Grabación de audio (MediaRecorder) ───────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const socketRef = useRef(null)

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const dialogTimeoutRefs = useRef([])
  const llamadaRef = useRef(null)   // para evitar re-disparar diálogos
  const elapsedRef = useRef(0)
  const speakerOffRef = useRef(speakerOff)

  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  useEffect(() => {
    speakerOffRef.current = speakerOff
  }, [speakerOff])

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // ─── Cargar datos de la llamada ───────────────────────────────────────────
  useEffect(() => {
    const fetchLlamada = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/llamadas/${id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Llamada no encontrada')
        setLlamada(data.llamada)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLlamada()
  }, [id])

  // ─── Conectar Socket.io ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = io('http://localhost:3000')
    socketRef.current = socket

    socket.emit('join_call', id)

    return () => {
      socket.disconnect()
    }
  }, [id])

  // ─── Temporizador de llamada ──────────────────────────────────────────────
  useEffect(() => {
    if (!llamada) return

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [llamada])

  // Auto-scroll del panel de transcripción
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight
    }
  }, [transcripciones, interimText])

  // ─── Función para agregar entrada de transcripción ──────────────────
  const agregarTranscripcion = useCallback((emisor, texto, tiempoActual = null) => {
    if (!texto || !texto.trim()) return

    const t = tiempoActual || formatTime(elapsedRef.current)
    const nuevoMensaje = {
      id: Date.now() + Math.random(),
      emisor,
      texto: texto.trim(),
      tiempo: t,
    }

    setTranscripciones((prev) => [...prev, nuevoMensaje])

    if (socketRef.current) {
      socketRef.current.emit('llamada:transcripcion', {
        id_llamada: id,
        ...nuevoMensaje,
      })
    }
  }, [id])

  // ─── Sintetizar voz del cliente simulado (Text-To-Speech) ──────────
  const hablarCliente = useCallback((texto) => {
    if (speakerOffRef.current || !window.speechSynthesis) return

    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(texto)
      utterance.lang = 'es-CR'
      utterance.rate = 1.05
      utterance.pitch = 1.0

      const voices = window.speechSynthesis.getVoices()
      const vozEs = voices.find((v) => v.lang.startsWith('es'))
      if (vozEs) utterance.voice = vozEs

      window.speechSynthesis.speak(utterance)
    } catch {
      // Ignorar fallo de TTS
    }
  }, [])

  // ─── Diálogos simulados del cliente (se lanzan solo una vez al cargar) ─────
  useEffect(() => {
    if (!llamada) return
    // Evitar relanzar si ya se inició para este escenario
    if (llamadaRef.current === llamada.id_llamada) return
    llamadaRef.current = llamada.id_llamada

    const sim = llamada.simulacion || {}
    const params = sim.parametros || {}
    const tono = (params.tono_cliente || 'normal').toLowerCase()

    let saludo = 'Buenas tardes. Le llamo porque necesito resolver una situación con mi cuenta bancaria.'
    if (sim.nombre?.toLowerCase().includes('cargo') || sim.descripcion?.toLowerCase().includes('cargo')) {
      saludo = 'Buenas tardes. Me comunico porque me llegó un cargo no reconocido en mi estado de cuenta y necesito aclararlo de inmediato.'
    } else if (sim.nombre?.toLowerCase().includes('bloqueo') || sim.descripcion?.toLowerCase().includes('bloqueo')) {
      saludo = 'Hola, buenas tardes. Mi tarjeta fue bloqueada sin previo aviso al intentar pagar y necesito desbloquearla urgentemente.'
    } else if (sim.nombre?.toLowerCase().includes('información') || sim.descripcion?.toLowerCase().includes('información')) {
      saludo = 'Buenas tardes, llamo para solicitar información sobre las condiciones de una cuenta de ahorros.'
    }

    if (tono.includes('inconforme') || tono.includes('molesto') || tono.includes('exigente')) {
      saludo = 'Buenas tardes. Llevo más de 15 minutos esperando en línea. Tengo un cobro irregular en mi cuenta y exijo que me lo solucionen ya mismo.'
    }

    // Diálogo 1: El cliente habla tras 3 segundos
    const t1 = setTimeout(() => {
      agregarTranscripcion('Cliente', saludo, '00:03')
      hablarCliente(saludo)
    }, 2800)

    // Diálogo 2: El cliente proporciona datos tras 28 segundos
    const t2 = setTimeout(() => {
      const datos = 'Sí claro, mi nombre completo es María González Pérez y mi cédula es 1-1456-0789. El cobro fue realizado ayer.'
      agregarTranscripcion('Cliente', datos, '00:28')
      hablarCliente(datos)
    }, 28000)

    // Diálogo 3: El cliente solicita confirmación tras 55 segundos
    const t3 = setTimeout(() => {
      const confirmacion = 'Entiendo la explicación. ¿Cuánto tiempo tarda en verse reflejado el comprobante del trámite?'
      agregarTranscripcion('Cliente', confirmacion, '00:55')
      hablarCliente(confirmacion)
    }, 55000)

    // Diálogo 4: Despedida tras 90 segundos
    const t4 = setTimeout(() => {
      const despedida = 'Perfecto, muchas gracias por su atención y rapidez. Que pase un buen día.'
      agregarTranscripcion('Cliente', despedida, '01:30')
      hablarCliente(despedida)
    }, 90000)

    dialogTimeoutRefs.current = [t1, t2, t3, t4]

    return () => {
      dialogTimeoutRefs.current.forEach(clearTimeout)
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [llamada, agregarTranscripcion, hablarCliente])

  // ─── HUL08: Reconocimiento de voz del Agente (Web Speech Recognition) ─────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'es-CR'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            agregarTranscripcion('Agente', trans)
            setInterimText('')
          } else {
            interim += trans
          }
        }
        if (interim) setInterimText(interim)
      }

      recognition.onerror = () => {
        // Ignorar errores menores de audio
      }

      recognition.onend = () => {
        // Reiniciar si sigue en llamada y no está silenciado
        if (!muted && mediaRecorderRef.current?.state === 'recording') {
          try { recognition.start() } catch { /* ignore */ }
        }
      }

      if (!muted) {
        try { recognition.start() } catch { /* ignore */ }
      }

      recognitionRef.current = recognition
    } catch {
      // Navegador sin soporte completo
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* ignore */ }
      }
    }
  }, [muted, agregarTranscripcion])

  // ─── HUL09: Iniciar grabación con MediaRecorder al comenzar llamada ────────
  useEffect(() => {
    let active = true

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!active) return

        audioStreamRef.current = stream
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
        })

        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data)
          }
        }

        mediaRecorder.start(1000) // Emitir fragmentos cada 1 segundo
        mediaRecorderRef.current = mediaRecorder
        setIsRecording(true)
      } catch (err) {
        console.warn('Micrófono físico no disponible o permiso denegado, usando grabación simulada:', err)
        setIsRecording(true) // Simulación activa
      }
    }

    startRecording()

    return () => {
      active = false
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
      }
    }
  }, [])

  // Silenciar / reactivar micrófono en tiempo real
  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev
      if (audioStreamRef.current) {
        audioStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = !next
        })
      }
      if (recognitionRef.current) {
        if (next) {
          try { recognitionRef.current.stop() } catch { /* ignore */ }
        } else {
          try { recognitionRef.current.start() } catch { /* ignore */ }
        }
      }
      return next
    })
  }

  // ─── HUL08: Enviar respuesta manual del agente ────────────────────────────
  const handleSendManual = (e) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    agregarTranscripcion('Agente', manualInput.trim())
    setManualInput('')
  }

  // ─── Generar Blob de audio fallback si no hubo captura de micrófono ───────
  const generarAudioFallback = () => {
    try {
      const sampleRate = 8000
      const durationSeconds = Math.max(1, elapsed)
      const numSamples = sampleRate * durationSeconds
      const buffer = new ArrayBuffer(44 + numSamples)
      const view = new DataView(buffer)

      // Encabezado WAV 8kHz mono 8-bit PCM
      const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
      }
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + numSamples, true)
      writeString(8, 'WAVE')
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate, true)
      view.setUint16(32, 1, true)
      view.setUint16(34, 8, true)
      writeString(36, 'data')
      view.setUint32(40, numSamples, true)

      // Tono suave alternado
      for (let i = 0; i < numSamples; i++) {
        const val = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 15 + 128
        view.setUint8(44 + i, Math.floor(val))
      }

      return new Blob([buffer], { type: 'audio/wav' })
    } catch {
      return new Blob(['Simulated Call Recording Audio'], { type: 'audio/webm' })
    }
  }

  // ─── HUL09 & HUL08: Finalizar y Guardar Grabación y Transcripción ──────────
  const finalizarLlamada = useCallback(async () => {
    clearInterval(timerRef.current)
    dialogTimeoutRefs.current.forEach(clearTimeout)
    if (window.speechSynthesis) window.speechSynthesis.cancel()

    setSavingCall(true)

    // 1. Detener reconocimiento
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignore */ }
    }

    // 2. Detener grabadora y obtener Blob de audio
    let audioBlob = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise((resolve) => {
          mediaRecorderRef.current.onstop = resolve
          mediaRecorderRef.current.stop()
        })
      } catch { /* ignore */ }
    }

    if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    } else {
      audioBlob = generarAudioFallback()
    }

    // 3. Convertir audio a Base64 para almacenar en servidor (HUL09)
    try {
      const reader = new FileReader()
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(audioBlob)
      })
      const audioBase64 = await base64Promise

      // Guardar grabación en backend
      await fetch(`http://localhost:3000/api/llamadas/${id}/grabacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: audioBase64,
          duracion: elapsed,
          formato: audioBlob.type.includes('wav') ? 'wav' : 'webm',
        }),
      })
    } catch (err) {
      console.warn('Error al almacenar archivo de grabación:', err)
    }

    // 4. Guardar transcripción en backend (HUL08)
    try {
      await fetch(`http://localhost:3000/api/llamadas/${id}/transcripcion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenido: transcripciones,
          idioma: 'es-CR',
        }),
      })
    } catch (err) {
      console.warn('Error al guardar transcripción:', err)
    }

    // 5. Finalizar estado de la llamada
    try {
      await fetch(`http://localhost:3000/api/llamadas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'finalizada', notas_admin: notas }),
      })
    } catch {
      // Ignorar fallo de navegación
    }

    setSavingCall(false)
    navigate(profile?.role === 'admin' ? '/admin/recordings' : '/home')
  }, [id, elapsed, notas, transcripciones, navigate, profile])

  // Checklist del escenario
  const getChecklist = () => {
    const params = llamada?.simulacion?.parametros || {}
    const hasGreeting = transcripciones.some((t) => t.emisor === 'Agente')
    const hasLength = elapsed > 20
    const hasResolution = elapsed > 45

    return [
      { label: 'Saludar al cliente con cortesía y presentarse', done: hasGreeting },
      { label: 'Escuchar y registrar el motivo de la llamada', done: transcripciones.length >= 2 },
      { label: 'Validar identidad del cliente bancario', done: hasLength },
      { label: 'Ofrecer solución y protocolo de seguridad', done: hasResolution },
      {
        label: `Mantener tono ${params.tono_cliente === 'inconforme' ? 'profesional ante reclamo' : 'amable y empático'}`,
        done: !muted,
      },
      { label: 'Confirmar resolución y despedirse cordial', done: elapsed > 70 },
    ]
  }

  // ─── Pantallas de carga / error / guardado ─────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#64748B' }}>Conectando llamada...</p>
      </div>
    )
  }

  if (error || !llamada) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: '#EF4444', fontWeight: 600 }}>{error || 'Llamada no encontrada'}</p>
        <button onClick={() => navigate('/home')} style={{ padding: '0.5rem 1.25rem', background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  const sim = llamada.simulacion || {}
  const params = sim.parametros || {}
  const checklist = getChecklist()

  return (
    <div>
      {/* Modal overlay al guardar grabación */}
      {savingCall && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 99999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', gap: '1rem', backdropFilter: 'blur(4px)',
        }}>
          <Loader2 size={40} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Guardando grabación y transcripción...</h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.85, margin: 0 }}>Almacenando audio en el servidor y procesando sesión.</p>
        </div>
      )}

      {/* ── Barra superior ─────────────────────────────────────────── */}
      <header className="session-bar">
        {/* Marca */}
        <div className="brand-mark">
          <Landmark size={18} />
          <span>SimuBank</span>
        </div>

        {/* Centro: sesión activa + indicador HUL09 de grabación + timer */}
        <div className="session-bar__center">
          <span className="session-tag">
            <span className="session-tag__dot" />
            En llamada
          </span>

          {/* HUL09: Indicador de Grabación Automática */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            backgroundColor: '#FEF2F2', color: '#DC2626',
            border: '1px solid #FECACA', padding: '4px 10px',
            borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: '0.04em',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#DC2626',
              boxShadow: '0 0 6px rgba(220, 38, 38, 0.8)',
              animation: 'pulse 1s infinite alternate',
            }} />
            REC GRABANDO
          </span>

          <span className="session-timer">{formatTime(elapsed)}</span>
        </div>

        {/* Salir */}
        <button
          className="session-bar__exit"
          onClick={finalizarLlamada}
          title="Finalizar y guardar"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* ── Área principal 3 columnas ──────────────────────────────── */}
      <div className="session-main">

        {/* ── Panel izquierdo: datos del cliente simulado ───────────── */}
        <aside className="panel client-panel">
          <div className="client-panel__head">
            <div className="client-avatar">CL</div>
            <h2>Cliente simulado</h2>
            <p className="client-meta">Escenario de práctica</p>
            <span className="priority-tag priority-tag--normal">
              {params.dificultad ? `Dificultad: ${params.dificultad}` : 'Normal'}
            </span>
          </div>

          <ul className="client-info-list">
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Info size={13} />
                Escenario
              </span>
              <span className="client-info-item__value">{sim.nombre || '—'}</span>
            </li>
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Info size={13} />
                Duración estimada
              </span>
              <span className="client-info-item__value">
                {params.duracion_minutos ? `${params.duracion_minutos} min` : '10 min'}
              </span>
            </li>
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Info size={13} />
                Tono del cliente
              </span>
              <span className="client-info-item__value" style={{ textTransform: 'capitalize' }}>
                {params.tono_cliente || 'Normal'}
              </span>
            </li>
            <li className="client-info-item">
              <span className="client-info-item__label">
                <Radio size={13} />
                Estado grabación
              </span>
              <span className="client-info-item__value" style={{ color: '#16A34A' }}>
                Almacenando audio
              </span>
            </li>
          </ul>

          {sim.descripcion && (
            <div className="client-panel__note">
              <Info size={16} />
              <p>{sim.descripcion}</p>
            </div>
          )}
        </aside>

        {/* ── Panel central: visualización y controles de llamada ───── */}
        <section className="call-stage" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Avatar y visual central */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem' }}>
            <div className="call-visual">
              <div className="call-ring call-ring--1" />
              <div className="call-ring call-ring--2" />
              <div className="call-avatar">CL</div>
            </div>

            <p className="call-name">Cliente bancario</p>
            <p className="call-status">● Llamada en curso con audio en vivo</p>

            {/* Controles: micrófono, altavoz */}
            <div className="call-controls" style={{ marginBottom: '1.25rem' }}>
              <button
                className="call-control"
                onClick={toggleMute}
                title={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
                style={{ backgroundColor: muted ? '#FEE2E2' : '#FFFFFF', color: muted ? '#DC2626' : '#1E293B' }}
              >
                {muted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                className="call-control"
                onClick={() => setSpeakerOff((s) => !s)}
                title={speakerOff ? 'Activar audio del cliente' : 'Silenciar audio del cliente'}
                style={{ backgroundColor: speakerOff ? '#FEE2E2' : '#FFFFFF', color: speakerOff ? '#DC2626' : '#1E293B' }}
              >
                {speakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            {/* Botón Finalizar llamada */}
            <button className="end-call-btn" onClick={finalizarLlamada} disabled={savingCall}>
              <PhoneOff size={18} />
              <span>Finalizar y guardar llamada</span>
            </button>
          </div>
        </section>

        {/* ── Panel derecho: HUL08 Transcripción en vivo y Checklist ── */}
        <aside className="panel guide-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', overflow: 'hidden' }}>
          
          {/* Selector de pestaña Transcripción / Checklist */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '0.85rem' }}>
            <button
              onClick={() => setActiveTab('transcription')}
              style={{
                flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem', fontWeight: 700,
                borderBottom: activeTab === 'transcription' ? '2.5px solid #1E3A8A' : 'none',
                color: activeTab === 'transcription' ? '#1E3A8A' : '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <FileText size={15} />
              Transcripción en vivo
              {transcripciones.length > 0 && (
                <span style={{ fontSize: '0.7rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '1px 6px', borderRadius: '999px' }}>
                  {transcripciones.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('checklist')}
              style={{
                flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.85rem', fontWeight: 700,
                borderBottom: activeTab === 'checklist' ? '2.5px solid #1E3A8A' : 'none',
                color: activeTab === 'checklist' ? '#1E3A8A' : '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={15} />
              Guía y notas
            </button>
          </div>

          {/* VISTA 1: HUL08 Transcripción en tiempo real */}
          {activeTab === 'transcription' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div
                ref={transcriptScrollRef}
                style={{
                  flex: 1, overflowY: 'auto', paddingRight: '4px',
                  display: 'flex', flexDirection: 'column', gap: '0.65rem',
                }}
              >
                {transcripciones.length === 0 && !interimText && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8' }}>
                    <Sparkles size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Iniciando transcripción en tiempo real...</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>Habla por el micrófono o escribe una respuesta para transcribir.</p>
                  </div>
                )}

                {transcripciones.map((item) => {
                  const isAgent = item.emisor === 'Agente'
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isAgent ? '#1D4ED8' : '#D97706' }}>
                          {item.emisor}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{item.tiempo}</span>
                      </div>

                      <div
                        style={{
                          maxWidth: '92%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '12px',
                          backgroundColor: isAgent ? '#EFF6FF' : '#F8FAFC',
                          border: `1px solid ${isAgent ? '#BFDBFE' : '#E2E8F0'}`,
                          color: '#1E293B',
                          fontSize: '0.82rem',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.texto}
                      </div>
                    </div>
                  )
                })}

                {/* Texto provisional en vivo mientras el usuario habla */}
                {interimText && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.7rem', color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Radio size={10} /> Escuchando...
                    </span>
                    <div
                      style={{
                        maxWidth: '92%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '12px',
                        backgroundColor: '#F0FDF4',
                        border: '1px dashed #86EFAC',
                        color: '#15803D',
                        fontSize: '0.82rem',
                        fontStyle: 'italic',
                      }}
                    >
                      {interimText}
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de respuesta rápida para la transcripción */}
              <form onSubmit={handleSendManual} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Escribe lo que dices al cliente..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  title="Enviar a la transcripción"
                  style={{
                    padding: '0.5rem 0.75rem', backgroundColor: '#1E3A8A', color: '#fff',
                    borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* VISTA 2: Checklist y notas */}
          {activeTab === 'checklist' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="guide-panel__section" style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1E293B' }}>
                  Lista de verificación
                </h3>
                <ul className="checklist">
                  {checklist.map((item, i) => (
                    <li key={i} style={{ fontSize: '0.8rem' }}>
                      <span className={`checklist__box ${item.done ? 'checked' : ''}`} />
                      <span style={{ color: item.done ? '#1E293B' : '#64748B' }}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="guide-panel__section">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1E293B' }}>
                  Mis notas
                </h3>
                <textarea
                  className="notes-area"
                  rows={4}
                  placeholder="Escribe observaciones de la simulación..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
