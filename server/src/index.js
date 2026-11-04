import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'

import usersRouter from './routes/users.js'
import simulacionesRouter from './routes/simulaciones.js'
import llamadasRouter from './routes/llamadas.js'
import { iniciarRecordatorios } from './lib/recordatorios.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL },
})

// Exponer `io` para que los routers puedan emitir eventos
app.set('io', io)

app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

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