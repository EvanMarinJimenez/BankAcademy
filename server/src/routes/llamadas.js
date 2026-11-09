import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseAdmin } from '../lib/supabase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Schema real de la BD:
//
// llamada:              id_llamada (PK), id_simulacion (FK), tipo, fecha_inicio,
//                       fecha_fin, duracion, estado, iniciada_por (UUID, nuevo)
//
// participante_llamada: id_participante_llamada (PK), id_llamada (FK),
//                       id_usuario (FK→usuario legacy), rol_llamada,
//                       fecha_ingreso, fecha_salida, profile_id (UUID, nuevo)
//
// La lógica de "quién participa" se resuelve a través de participante_llamada
// usando la columna profile_id que agregamos en la migración 006.
// ─────────────────────────────────────────────────────────────────────────────

// ─── GET /api/llamadas ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query

    let query = supabaseAdmin
      .from('llamada')
      .select(`
        *,
        simulacion:id_simulacion(id_simulacion, nombre, tipo, parametros),
        participante_llamada(
          id_participante_llamada,
          rol_llamada,
          fecha_ingreso,
          fecha_salida,
          profile_id,
          profiles:profile_id(id, first_name, last_name, email)
        )
      `)
      .order('fecha_inicio', { ascending: false })

    if (estado) query = query.eq('estado', estado)

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })

    return res.json({ llamadas: data || [] })
  } catch (err) {
    console.error('GET /api/llamadas:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── GET /api/llamadas/disponibles ──────────────────────────────────────────
// HUL07: Listar participantes disponibles para ser llamados.
// Disponible = tiene simulación de tipo 'llamada' activa asignada
//              Y no está ya en una llamada 'en_curso'.
router.get('/disponibles', async (req, res) => {
  try {
    // 1. Obtener asignaciones activas de tipo llamada
    const { data: asignaciones, error: errAsig } = await supabaseAdmin
      .from('participante_simulacion')
      .select(`
        profile_id,
        simulacion:id_simulacion(id_simulacion, nombre, tipo, estado, parametros),
        profiles:profile_id(id, first_name, last_name, email)
      `)
      .not('simulacion', 'is', null)

    if (errAsig) return res.status(400).json({ error: errAsig.message })

    // 2. Filtrar solo simulaciones de tipo 'llamada' y estado vigente ('activa' o 'programada')
    const estadosVigentes = ['activa', 'programada']
    const activos = (asignaciones || []).filter(
      (a) =>
        a.simulacion?.tipo === 'llamada' &&
        estadosVigentes.includes(a.simulacion?.estado) &&
        a.profiles
    )

    if (activos.length === 0) {
      return res.json({ disponibles: [] })
    }

    // 3. Obtener participantes que YA están en una llamada en curso
    const { data: enCurso, error: errCurso } = await supabaseAdmin
      .from('participante_llamada')
      .select('profile_id, llamada:id_llamada(estado)')
      .not('profile_id', 'is', null)

    if (errCurso) return res.status(400).json({ error: errCurso.message })

    const ocupados = new Set(
      (enCurso || [])
        .filter((pl) => pl.llamada?.estado === 'en_curso')
        .map((pl) => pl.profile_id)
    )

    // 4. Filtrar disponibles
    const disponibles = activos
      .filter((a) => !ocupados.has(a.profile_id))
      .map((a) => ({
        participante: a.profiles,
        simulacion: a.simulacion,
      }))

    return res.json({ disponibles })
  } catch (err) {
    console.error('GET /api/llamadas/disponibles:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── GET /api/llamadas/random ────────────────────────────────────────────────
// HUL06: Elegir al azar un participante disponible
router.get('/random', async (req, res) => {
  try {
    // Reutilizar la lógica de /disponibles
    const { data: asignaciones, error: errAsig } = await supabaseAdmin
      .from('participante_simulacion')
      .select(`
        profile_id,
        simulacion:id_simulacion(id_simulacion, nombre, tipo, estado, parametros),
        profiles:profile_id(id, first_name, last_name, email)
      `)
      .not('simulacion', 'is', null)

    if (errAsig) return res.status(400).json({ error: errAsig.message })

    const estadosVigentes = ['activa', 'programada']
    const activos = (asignaciones || []).filter(
      (a) =>
        a.simulacion?.tipo === 'llamada' &&
        estadosVigentes.includes(a.simulacion?.estado) &&
        a.profiles
    )

    if (activos.length === 0) {
      return res.status(404).json({ error: 'No hay participantes con simulaciones de llamada activas.' })
    }

    const { data: enCurso } = await supabaseAdmin
      .from('participante_llamada')
      .select('profile_id, llamada:id_llamada(estado)')
      .not('profile_id', 'is', null)

    const ocupados = new Set(
      (enCurso || [])
        .filter((pl) => pl.llamada?.estado === 'en_curso')
        .map((pl) => pl.profile_id)
    )

    const disponibles = activos.filter((a) => !ocupados.has(a.profile_id))

    if (disponibles.length === 0) {
      return res.status(404).json({ error: 'No hay participantes disponibles en este momento.' })
    }

    const elegido = disponibles[Math.floor(Math.random() * disponibles.length)]

    return res.json({
      participante: elegido.profiles,
      simulacion: elegido.simulacion,
    })
  } catch (err) {
    console.error('GET /api/llamadas/random:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── GET /api/llamadas/grabaciones ──────────────────────────────────────────
// HUL09: Listar todas las grabaciones con datos de la llamada, participante y escenario
router.get('/grabaciones', async (req, res) => {
  try {
    const { data: grabaciones, error } = await supabaseAdmin
      .from('grabacion')
      .select(`
        *,
        llamada:id_llamada (
          id_llamada,
          tipo,
          estado,
          fecha_inicio,
          fecha_fin,
          duracion,
          simulacion:id_simulacion (
            id_simulacion,
            nombre,
            tipo,
            parametros
          ),
          participante_llamada (
            profile_id,
            profiles:profile_id (
              id,
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .order('fecha_creacion', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })

    return res.json({ grabaciones: grabaciones || [] })
  } catch (err) {
    console.error('GET /api/llamadas/grabaciones:', err)
    return res.status(500).json({ error: 'Error del servidor al obtener grabaciones' })
  }
})

// ─── GET /api/llamadas/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabaseAdmin
      .from('llamada')
      .select(`
        *,
        simulacion:id_simulacion(id_simulacion, nombre, tipo, descripcion, parametros),
        participante_llamada(
          id_participante_llamada,
          rol_llamada,
          fecha_ingreso,
          fecha_salida,
          profile_id,
          profiles:profile_id(id, first_name, last_name, email)
        )
      `)
      .eq('id_llamada', id)
      .single()

    if (error) return res.status(404).json({ error: 'Llamada no encontrada' })

    return res.json({ llamada: data })
  } catch (err) {
    console.error('GET /api/llamadas/:id:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── POST /api/llamadas/iniciar ──────────────────────────────────────────────
// HUL06 y HUL07: Crear la llamada y emitir evento Socket.io
// Body: { profile_id, id_simulacion, iniciada_por }
router.post('/iniciar', async (req, res) => {
  try {
    const { profile_id, id_simulacion, iniciada_por } = req.body

    if (!profile_id || !id_simulacion) {
      return res.status(400).json({ error: 'profile_id e id_simulacion son obligatorios.' })
    }

    // Verificar que el participante no esté ya en una llamada activa
    const { data: yaEnCurso } = await supabaseAdmin
      .from('participante_llamada')
      .select('id_participante_llamada, llamada:id_llamada(estado)')
      .eq('profile_id', profile_id)
      .not('profile_id', 'is', null)

    const enCurso = (yaEnCurso || []).find((pl) => pl.llamada?.estado === 'en_curso')
    if (enCurso) {
      return res.status(409).json({ error: 'El participante ya tiene una llamada en curso.' })
    }

    // Obtener el tipo de la simulación
    const { data: sim, error: simErr } = await supabaseAdmin
      .from('simulacion')
      .select('tipo, nombre, descripcion, parametros')
      .eq('id_simulacion', id_simulacion)
      .single()

    if (simErr || !sim) {
      return res.status(404).json({ error: 'Simulación no encontrada.' })
    }

    // 1. Crear la llamada
    const { data: llamada, error: errLlamada } = await supabaseAdmin
      .from('llamada')
      .insert({
        id_simulacion: Number(id_simulacion),
        tipo: sim.tipo,
        fecha_inicio: new Date().toISOString(),
        estado: 'en_curso',
        iniciada_por: iniciada_por || null,
      })
      .select()
      .single()

    if (errLlamada) return res.status(400).json({ error: errLlamada.message })

    // 2. Registrar participante en participante_llamada con profile_id
    const { error: errPart } = await supabaseAdmin
      .from('participante_llamada')
      .insert({
        id_llamada: llamada.id_llamada,
        rol_llamada: 'participante',
        fecha_ingreso: new Date().toISOString(),
        profile_id,
        // id_usuario se deja NULL porque usamos el sistema moderno de profiles
      })

    if (errPart) {
      // Revertir la llamada si falla la inserción del participante
      await supabaseAdmin.from('llamada').delete().eq('id_llamada', llamada.id_llamada)
      return res.status(400).json({ error: errPart.message })
    }

    // 3. Emitir evento Socket.io al participante
    const io = req.app.get('io')
    if (io) {
      io.to(profile_id).emit('llamada:entrante', {
        id_llamada: llamada.id_llamada,
        simulacion: { ...sim, id_simulacion: Number(id_simulacion) },
      })
    }

    return res.status(201).json({
      message: 'Llamada iniciada exitosamente',
      llamada: { ...llamada, simulacion: sim },
    })
  } catch (err) {
    console.error('POST /api/llamadas/iniciar:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── PATCH /api/llamadas/:id/status ─────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { estado, notas_admin } = req.body

    const estadosValidos = ['en_curso', 'finalizada', 'perdida', 'rechazada']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Use: ${estadosValidos.join(', ')}` })
    }

    const payload = { estado }

    // Registrar fecha de fin y duración al cerrar
    if (['finalizada', 'perdida', 'rechazada'].includes(estado)) {
      const fechaFin = new Date().toISOString()
      payload.fecha_fin = fechaFin

      // Calcular duración en segundos a partir de fecha_inicio
      const { data: llamadaActual } = await supabaseAdmin
        .from('llamada')
        .select('fecha_inicio')
        .eq('id_llamada', id)
        .single()

      if (llamadaActual?.fecha_inicio) {
        const inicio = new Date(llamadaActual.fecha_inicio)
        const fin = new Date(fechaFin)
        payload.duracion = Math.round((fin - inicio) / 1000)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('llamada')
      .update(payload)
      .eq('id_llamada', id)
      .select(`
        *,
        simulacion:id_simulacion(id_simulacion, nombre, tipo),
        participante_llamada(profile_id)
      `)
      .single()

    if (error) return res.status(400).json({ error: error.message })

    // Actualizar fecha_salida en participante_llamada
    if (['finalizada', 'perdida', 'rechazada'].includes(estado)) {
      await supabaseAdmin
        .from('participante_llamada')
        .update({ fecha_salida: payload.fecha_fin })
        .eq('id_llamada', id)
    }

    // Notificar vía socket a todos los participantes de la llamada
    const io = req.app.get('io')
    if (io && data?.participante_llamada) {
      data.participante_llamada.forEach((pl) => {
        if (pl.profile_id) {
          io.to(pl.profile_id).emit('llamada:estado', {
            id_llamada: data.id_llamada,
            estado: data.estado,
          })
        }
      })
    }

    return res.json({ message: `Llamada ${estado} exitosamente`, llamada: data })
  } catch (err) {
    console.error('PATCH /api/llamadas/:id/status:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── POST /api/llamadas/liberar-todas ────────────────────────────────────────
// Admin: marcar todas las llamadas "en_curso" como "finalizada" para liberar participantes
router.post('/liberar-todas', async (req, res) => {
  try {
    const fechaFin = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('llamada')
      .update({ estado: 'finalizada', fecha_fin: fechaFin })
      .eq('estado', 'en_curso')
      .select('id_llamada')

    if (error) return res.status(400).json({ error: error.message })

    return res.json({
      message: `${(data || []).length} llamada(s) liberada(s) exitosamente`,
      liberadas: (data || []).map((l) => l.id_llamada),
    })
  } catch (err) {
    console.error('POST /api/llamadas/liberar-todas:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── POST /api/llamadas/:id/grabacion ───────────────────────────────────────
// HUL09: Guardar archivo de audio y registrar en la tabla grabacion
router.post('/:id/grabacion', async (req, res) => {
  try {
    const { id } = req.params
    const { audio_base64, duracion, formato = 'webm' } = req.body

    let url_archivo = ''

    if (audio_base64) {
      const buffer = Buffer.from(audio_base64.replace(/^data:audio\/\w+;base64,/, ''), 'base64')
      const fileName = `grabacion_llamada_${id}_${Date.now()}.${formato}`
      const recordingsDir = path.join(__dirname, '../../uploads/recordings')
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true })
      }
      const uploadPath = path.join(recordingsDir, fileName)
      await fs.promises.writeFile(uploadPath, buffer)
      url_archivo = `http://localhost:${process.env.PORT || 3000}/uploads/recordings/${fileName}`
    } else if (req.body.url_archivo) {
      url_archivo = req.body.url_archivo
    } else {
      url_archivo = `http://localhost:${process.env.PORT || 3000}/uploads/recordings/audio_simulado_${id}.webm`
    }

    const { data, error } = await supabaseAdmin
      .from('grabacion')
      .insert({
        id_llamada: Number(id),
        url_archivo,
        duracion: duracion ? Number(duracion) : null,
      })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    return res.status(201).json({ message: 'Grabación almacenada exitosamente', grabacion: data })
  } catch (err) {
    console.error('POST /api/llamadas/:id/grabacion:', err)
    return res.status(500).json({ error: 'Error al almacenar grabación' })
  }
})

// ─── GET /api/llamadas/:id/grabacion ────────────────────────────────────────
router.get('/:id/grabacion', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabaseAdmin
      .from('grabacion')
      .select('*')
      .eq('id_llamada', id)
      .maybeSingle()

    if (error) return res.status(400).json({ error: error.message })
    return res.json({ grabacion: data })
  } catch (err) {
    console.error('GET /api/llamadas/:id/grabacion:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// ─── POST /api/llamadas/:id/transcripcion ───────────────────────────────────
// HUL08: Guardar transcripción generada durante la llamada
router.post('/:id/transcripcion', async (req, res) => {
  try {
    const { id } = req.params
    const { contenido, idioma = 'es-CR' } = req.body

    if (!contenido) {
      return res.status(400).json({ error: 'El contenido de la transcripción es obligatorio' })
    }

    const contenidoStr = typeof contenido === 'string' ? contenido : JSON.stringify(contenido)

    const { data, error } = await supabaseAdmin
      .from('transcripcion')
      .insert({
        id_llamada: Number(id),
        contenido: contenidoStr,
        idioma,
      })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    return res.status(201).json({ message: 'Transcripción guardada exitosamente', transcripcion: data })
  } catch (err) {
    console.error('POST /api/llamadas/:id/transcripcion:', err)
    return res.status(500).json({ error: 'Error al guardar transcripción' })
  }
})

// ─── GET /api/llamadas/:id/transcripcion ────────────────────────────────────
router.get('/:id/transcripcion', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabaseAdmin
      .from('transcripcion')
      .select('*')
      .eq('id_llamada', id)
      .maybeSingle()

    if (error) return res.status(400).json({ error: error.message })
    return res.json({ transcripcion: data })
  } catch (err) {
    console.error('GET /api/llamadas/:id/transcripcion:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

export default router

// ─── DELETE /api/llamadas/grabaciones/:id_grabacion ────────────────────────────────────────
// Delete a specific recording by its id_grabacion
router.delete('/grabaciones/:id_grabacion', async (req, res) => {
  try {
    const { id_grabacion } = req.params;
    const { data, error } = await supabaseAdmin
      .from('grabacion')
      .delete()
      .eq('id_grabacion', Number(id_grabacion))
      .select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ message: 'Grabación eliminada', grabacion: data });
  } catch (err) {
    console.error('DELETE /api/llamadas/grabaciones/:id_grabacion:', err);
    return res.status(500).json({ error: 'Error del servidor al eliminar grabación' });
  }
});
