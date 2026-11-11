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

  // El admin hace de cliente y el participante de agente bancario
  const esAdmin = profile?.role === 'admin'
  const rol = profile?.role
  const miEmisor = esAdmin ? 'Cliente' : 'Agente'

  // Controles de llamada
  const [muted, setMuted] = useState(false)
  const [speakerOff, setSpeakerOff] = useState(false)
  const [elapsed, setElapsed] = useState(0) // segundos
  const [notas, setNotas] = useState('')
  const [conectado, setConectado] = useState(false)
  const [sinMicrofono, setSinMicrofono] = useState(false)

  // ─── HUL08: Transcripción en tiempo real ──────────────────────────────────
  const [transcripciones, setTranscripciones] = useState([])
  const [interimText, setInterimText] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [activeTab, setActiveTab] = useState('transcription') // 'transcription' | 'checklist'
  const transcriptScrollRef = useRef(null)

  // ─── Audio de la llamada (WebRTC) y grabación (MediaRecorder) ─────────────
  const audioStreamRef = useRef(null)     // micrófono propio
  const remoteStreamRef = useRef(null)    // audio de la otra persona
  const remoteAudioRef = useRef(null)
  const pcRef = useRef(null)
  const audioCtxRef = useRef(null)
  const mezclaRef = useRef(null)          // mezcla de ambas voces para la grabación (solo admin)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const socketRef = useRef(null)

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const elapsedRef = useRef(0)
  const finalizandoRef = useRef(false)
  const finalizarRef = useRef(null)

  useEffect(() => {
    elapsedRef.current = elapsed
  }, [elapsed])

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // ─── Cargar datos de la llamada ───────────────────────────────────────────
  useEffect(() => {
    const fetchLlamada = async () => {
      try {
        const res = await fetch(`/api/llamadas/${id}`)
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

  // ─── Micrófono + Socket.io + WebRTC ───────────────────────────────────────
  // Quien ya estaba en la sala hace la oferta cuando entra la otra persona.
  // Socket.io solo transporta la señalización; el audio viaja directo entre navegadores.
  useEffect(() => {
    if (!rol) return
    let cancelado = false
    const socket = io()
    socketRef.current = socket

    const crearConexion = () => {
      pcRef.current?.close()
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      const local = audioStreamRef.current
      local?.getTracks().forEach((track) => pc.addTrack(track, local))

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('rtc:signal', { id_llamada: id, candidate: e.candidate })
      }
      pc.ontrack = (e) => {
        const remoto = e.streams[0]
        remoteStreamRef.current = remoto
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoto
        if (mezclaRef.current) {
          audioCtxRef.current.createMediaStreamSource(remoto).connect(mezclaRef.current)
        }
        setConectado(true)
      }
      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) setConectado(false)
      }

      pcRef.current = pc
      return pc
    }

    // Los mensajes se procesan en orden para no agregar candidatos antes de la oferta
    let cola = Promise.resolve()
    const enCola = (fn) => {
      cola = cola.then(fn).catch((err) => console.warn('WebRTC:', err))
    }

    socket.on('rtc:peer-joined', () => enCola(async () => {
      const pc = crearConexion()
      await pc.setLocalDescription(await pc.createOffer())
      socket.emit('rtc:signal', { id_llamada: id, description: pc.localDescription })
    }))

    socket.on('rtc:signal', ({ description, candidate }) => enCola(async () => {
      if (description?.type === 'offer') {
        const pc = crearConexion()
        await pc.setRemoteDescription(description)
        await pc.setLocalDescription(await pc.createAnswer())
        socket.emit('rtc:signal', { id_llamada: id, description: pc.localDescription })
      } else if (description) {
        await pcRef.current?.setRemoteDescription(description)
      } else if (candidate) {
        await pcRef.current?.addIceCandidate(candidate)
      }
    }))

    socket.on('llamada:transcripcion', ({ id: msgId, emisor, texto, tiempo }) => {
      setTranscripciones((prev) => [...prev, { id: msgId, emisor, texto, tiempo }])
    })

    socket.on('rtc:hangup', () => finalizarRef.current?.(false))

    const iniciar = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        audioStreamRef.current = stream

        // HUL09: el admin graba la mezcla de las dos voces
        if (esAdmin) {
          const ctx = new AudioContext()
          const mezcla = ctx.createMediaStreamDestination()
          ctx.createMediaStreamSource(stream).connect(mezcla)
          audioCtxRef.current = ctx
          mezclaRef.current = mezcla

          const recorder = new MediaRecorder(mezcla.stream)
          audioChunksRef.current = []
          recorder.ondataavailable = (e) => {
            if (e.data?.size > 0) audioChunksRef.current.push(e.data)
          }
          recorder.start(1000)
          mediaRecorderRef.current = recorder
        }
      } catch (err) {
        console.warn('Micrófono no disponible o permiso denegado:', err)
        setSinMicrofono(true)
      }
      if (!cancelado) socket.emit('join_call', id)
    }
    iniciar()

    return () => {
      cancelado = true
      socket.disconnect()
      pcRef.current?.close()
      audioStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
      audioCtxRef.current?.close()
    }
  }, [id, rol, esAdmin])

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

  // ─── Agregar una frase propia a la transcripción y enviarla al otro lado ──
  const agregarTranscripcion = useCallback((texto) => {
    if (!texto || !texto.trim()) return

    const nuevoMensaje = {
      id: Date.now() + Math.random(),
      emisor: miEmisor,
      texto: texto.trim(),
      tiempo: formatTime(elapsedRef.current),
    }

    setTranscripciones((prev) => [...prev, nuevoMensaje])
    socketRef.current?.emit('llamada:transcripcion', { id_llamada: id, ...nuevoMensaje })
  }, [id, miEmisor])

  // ─── HUL08: Reconocimiento de voz propio (Web Speech Recognition) ─────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition || muted) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-CR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const trans = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          agregarTranscripcion(trans)
          setInterimText('')
        } else {
          interim += trans
        }
      }
      if (interim) setInterimText(interim)
    }

    // Chrome detiene el reconocimiento tras un silencio; reiniciarlo mientras siga la llamada
    let activo = true
    recognition.onend = () => {
      if (activo && !finalizandoRef.current) {
        try { recognition.start() } catch { /* ignore */ }
      }
    }

    try { recognition.start() } catch { /* ignore */ }
    recognitionRef.current = recognition

    return () => {
      activo = false
      try { recognition.stop() } catch { /* ignore */ }
    }
  }, [muted, agregarTranscripcion])

  // Silenciar / reactivar micrófono en tiempo real
  const toggleMute = () => {
    const next = !muted
    audioStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next
    })
    setMuted(next)
  }

  // ─── HUL08: Enviar texto manual a la transcripción ────────────────────────
  const handleSendManual = (e) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    agregarTranscripcion(manualInput.trim())
    setManualInput('')
  }

  // ─── Finalizar llamada ────────────────────────────────────────────────────
  // El admin guarda la grabación, la transcripción y sus notas.
  // avisar=false cuando fue la otra persona quien colgó.
  const finalizarLlamada = useCallback(async (avisar = true) => {
    if (finalizandoRef.current) return
    finalizandoRef.current = true

    clearInterval(timerRef.current)
    setSavingCall(true)
    if (avisar) socketRef.current?.emit('rtc:hangup', id)

    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    pcRef.current?.close()

    if (esAdmin) {
      // 1. Detener la grabadora y subir el audio (HUL09)
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        await new Promise((resolve) => {
          recorder.onstop = resolve
          recorder.stop()
        })
      }

      if (audioChunksRef.current.length > 0) {
        try {
          const tipo = recorder.mimeType || 'audio/webm'
          const audioBlob = new Blob(audioChunksRef.current, { type: tipo })
          const audioBase64 = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(audioBlob)
          })

          await fetch(`/api/llamadas/${id}/grabacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: audioBase64,
              duracion: elapsedRef.current,
              formato: tipo.includes('mp4') ? 'mp4' : 'webm',
            }),
          })
        } catch (err) {
          console.warn('Error al almacenar archivo de grabación:', err)
        }
      }

      // 2. Guardar transcripción (HUL08)
      if (transcripciones.length > 0) {
        try {
          await fetch(`/api/llamadas/${id}/transcripcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contenido: transcripciones, idioma: 'es-CR' }),
          })
        } catch (err) {
          console.warn('Error al guardar transcripción:', err)
        }
      }
    }

    // 3. Marcar la llamada como finalizada
    try {
      await fetch(`/api/llamadas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'finalizada', ...(esAdmin && { notas_admin: notas }) }),
      })
    } catch {
      // Ignorar fallo de red
    }

    setSavingCall(false)
    navigate(esAdmin ? '/admin/recordings' : '/home')
  }, [id, esAdmin, notas, transcripciones, navigate])

  useEffect(() => {
    finalizarRef.current = finalizarLlamada
  }, [finalizarLlamada])

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
          onClick={() => finalizarLlamada()}
          title="Finalizar llamada"
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
            <h2>{esAdmin ? 'Tu papel: cliente' : 'Cliente bancario'}</h2>
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

            {/* Audio de la otra persona. El ref se reaplica en cada render para mantener stream y silencio */}
            <audio
              autoPlay
              ref={(el) => {
                remoteAudioRef.current = el
                if (!el) return
                if (remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
                  el.srcObject = remoteStreamRef.current
                }
                el.muted = speakerOff
              }}
            />

            <p className="call-name">{esAdmin ? 'Participante (agente)' : 'Cliente bancario'}</p>
            <p className="call-status">
              {sinMicrofono
                ? '● Sin micrófono: la otra persona no podrá escucharte'
                : conectado
                  ? '● Llamada en curso con audio en vivo'
                  : '● Esperando a que la otra persona se conecte...'}
            </p>

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
                title={speakerOff ? 'Activar audio de la llamada' : 'Silenciar audio de la llamada'}
                style={{ backgroundColor: speakerOff ? '#FEE2E2' : '#FFFFFF', color: speakerOff ? '#DC2626' : '#1E293B' }}
              >
                {speakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>

            {/* Botón Finalizar llamada */}
            <button className="end-call-btn" onClick={() => finalizarLlamada()} disabled={savingCall}>
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

              {esAdmin && <div className="guide-panel__section">
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1E293B' }}>
                  Notas del evaluador
                </h3>
                <textarea
                  className="notes-area"
                  rows={4}
                  placeholder="Observaciones sobre el desempeño del participante (se guardan al finalizar)..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
