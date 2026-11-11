import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import usersRouter from './routes/users.js'
import simulacionesRouter from './routes/simulaciones.js'
import llamadasRouter from './routes/llamadas.js'
import { iniciarRecordatorios } from './lib/recordatorios.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Asegurar carpeta de grabaciones de audio
const recordingsDir = path.join(__dirname, '../uploads/recordings')
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true })
}

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || '*' },
})

// Exponer `io` para que los routers puedan emitir eventos
app.set('io', io)

app.use(cors({ origin: process.env.CLIENT_URL || '*' }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Servir archivos estáticos de grabaciones de audio (HUL09) **con CORS**
app.use(
  '/uploads',
  cors({ origin: process.env.CLIENT_URL || '*' }),
  express.static(path.join(__dirname, '../uploads'))
)
app.use('/api/users', usersRouter)
app.use('/api/simulaciones', simulacionesRouter)
app.use('/api/llamadas', llamadasRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id)

  // El participante se une a su room personal usando su profile_id
  socket.on('join', (profileId) => {
    if (profileId) {
      socket.join(profileId)
      console.log(`Socket ${socket.id} se unió al room ${profileId}`)
    }
  })

  // Room de la llamada. Al entrar, se avisa a quien ya estaba para que inicie la conexión WebRTC.
  socket.on('join_call', (callId) => {
    if (!callId) return
    socket.join(`call_${callId}`)
    socket.to(`call_${callId}`).emit('rtc:peer-joined')
  })

  // Señalización WebRTC (oferta, respuesta y candidatos ICE) hacia el otro lado de la llamada
  socket.on('rtc:signal', ({ id_llamada, ...data } = {}) => {
    if (id_llamada) socket.to(`call_${id_llamada}`).emit('rtc:signal', data)
  })

  // Uno de los dos colgó
  socket.on('rtc:hangup', (callId) => {
    if (callId) socket.to(`call_${callId}`).emit('rtc:hangup')
  })

  // Transcripción en tiempo real hacia el otro lado de la llamada (HUL08)
  socket.on('llamada:transcripcion', (data) => {
    if (data?.id_llamada) {
      socket.to(`call_${data.id_llamada}`).emit('llamada:transcripcion', data)
    }
  })

  socket.on('mensaje', (data) => {
    io.emit('mensaje', data)
  })

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id)
  })
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`)
  iniciarRecordatorios()
})