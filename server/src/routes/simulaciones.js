import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const router = Router()

// GET /api/simulaciones — listar con filtros
router.get('/', async (req, res) => {
  try {
    const { tipo, estado, search } = req.query

    let query = supabaseAdmin
      .from('simulacion')
      .select(`
        *,
        participante_simulacion(count)
      `)
      .order('id_simulacion', { ascending: false })

    if (tipo && tipo !== 'all') query = query.eq('tipo', tipo)
    if (estado && estado !== 'all') query = query.eq('estado', estado)
    if (search) query = query.ilike('nombre', `%${search}%`)

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })

    return res.json({ simulaciones: data })
  } catch (err) {
    console.error('GET /api/simulaciones:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// GET /api/simulaciones/mis-simulaciones/:profileId — listar simulaciones asignadas al participante
router.get('/mis-simulaciones/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params

    const { data, error } = await supabaseAdmin
      .from('participante_simulacion')
      .select(`
        id_participante,
        rol_practica,
        estado,
        fecha_asignacion,
        simulacion:id_simulacion (
          id_simulacion,
          nombre,
          descripcion,
          tipo,
          modalidad,
          fecha_inicio,
          fecha_fin,
          estado
        )
      `)
      .eq('profile_id', profileId)
      .order('fecha_asignacion', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })

    return res.json({ asignaciones: data || [] })
  } catch (err) {
    console.error('GET /api/simulaciones/mis-simulaciones/:profileId:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// GET /api/simulaciones/:id — obtener una simulación con sus participantes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabaseAdmin
      .from('simulacion')
      .select(`
        *,
        participante_simulacion(
          id_participante,
          profile_id,
          rol_practica,
          estado,
          fecha_asignacion,
          profiles:profile_id(id, first_name, last_name, email)
        )
      `)
      .eq('id_simulacion', id)
      .single()

    if (error) return res.status(404).json({ error: 'Simulación no encontrada' })

    return res.json({ simulacion: data })
  } catch (err) {
    console.error('GET /api/simulaciones/:id:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// POST /api/simulaciones — crear escenario (HUL01, HUL04, HUL05)
router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      tipo,
      modalidad,
      fecha_inicio,
      fecha_fin,
      estado,
      parametros,
      creado_por,
    } = req.body

    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'El nombre y el tipo son obligatorios.' })
    }

    const tiposValidos = ['llamada', 'chat', 'mixto']
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` })
    }

    // HUL05: Determinar estado (programada si fecha_inicio es a futuro o se especificó programada)
    let estadoFinal = estado || 'activa'
    if (!estado && fecha_inicio) {
      const fechaInicioDate = new Date(fecha_inicio)
      if (!isNaN(fechaInicioDate.getTime()) && fechaInicioDate > new Date()) {
        estadoFinal = 'programada'
      }
    }

    const insertData = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      tipo,
      modalidad: modalidad || 'individual',
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      estado: estadoFinal,
      creado_por: creado_por || null,
    }

    // HUL04: Parámetros de simulación
    if (parametros !== undefined) {
      insertData.parametros = typeof parametros === 'object' ? parametros : JSON.parse(parametros)
    }

    const { data, error } = await supabaseAdmin
      .from('simulacion')
      .insert(insertData)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    return res.status(201).json({ message: 'Escenario creado exitosamente', simulacion: data })
  } catch (err) {
    console.error('POST /api/simulaciones:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// PUT /api/simulaciones/:id — modificar escenario (HUL02, HUL04, HUL05)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, descripcion, tipo, modalidad, fecha_inicio, fecha_fin, estado, parametros } = req.body

    const payload = {}
    if (nombre !== undefined)       payload.nombre      = nombre.trim()
    if (descripcion !== undefined)  payload.descripcion = descripcion.trim()
    if (tipo !== undefined)         payload.tipo        = tipo
    if (modalidad !== undefined)    payload.modalidad   = modalidad
    if (fecha_inicio !== undefined) payload.fecha_inicio = fecha_inicio || null
    if (fecha_fin !== undefined)    payload.fecha_fin    = fecha_fin || null
    if (estado !== undefined)       payload.estado       = estado
    if (parametros !== undefined) {
      payload.parametros = typeof parametros === 'object' ? parametros : JSON.parse(parametros)
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar.' })
    }

    const { data, error } = await supabaseAdmin
      .from('simulacion')
      .update(payload)
      .eq('id_simulacion', id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    return res.json({ message: 'Escenario actualizado exitosamente', simulacion: data })
  } catch (err) {
    console.error('PUT /api/simulaciones/:id:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// PATCH /api/simulaciones/:id/status — cambiar estado (activa/inactiva/cancelada)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const estadosValidos = ['activa', 'inactiva', 'cancelada', 'programada', 'finalizada']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Use: ${estadosValidos.join(', ')}` })
    }

    const { data, error } = await supabaseAdmin
      .from('simulacion')
      .update({ estado })
      .eq('id_simulacion', id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    return res.json({ message: `Escenario ${estado} exitosamente`, simulacion: data })
  } catch (err) {
    console.error('PATCH /api/simulaciones/:id/status:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// POST /api/simulaciones/:id/assign — asignar participante(s) (HUL03)
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params
    const { profile_ids } = req.body // array de UUIDs

    if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
      return res.status(400).json({ error: 'Debes enviar un array de profile_ids.' })
    }

    const rows = profile_ids.map((profile_id) => ({
      id_simulacion: Number(id),
      profile_id,
      rol_practica: 'participante',
      estado: 'pendiente',
      fecha_asignacion: new Date().toISOString(),
    }))

    const { data, error } = await supabaseAdmin
      .from('participante_simulacion')
      .upsert(rows, { onConflict: 'id_simulacion,profile_id' })
      .select()

    if (error) return res.status(400).json({ error: error.message })

    return res.status(201).json({ message: 'Participantes asignados exitosamente', asignaciones: data })
  } catch (err) {
    console.error('POST /api/simulaciones/:id/assign:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// PUT /api/simulaciones/:id/assign — sincronizar lista completa de participantes (HUL03)
router.put('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params
    const { profile_ids } = req.body

    if (!Array.isArray(profile_ids)) {
      return res.status(400).json({ error: 'profile_ids debe ser un array' })
    }

    // 1. Obtener asignaciones actuales
    const { data: current, error: getErr } = await supabaseAdmin
      .from('participante_simulacion')
      .select('profile_id')
      .eq('id_simulacion', id)

    if (getErr) return res.status(400).json({ error: getErr.message })

    const currentIds = (current || []).map((c) => c.profile_id)

    // A eliminar
    const toRemove = currentIds.filter((cid) => !profile_ids.includes(cid))
    if (toRemove.length > 0) {
      const { error: delErr } = await supabaseAdmin
        .from('participante_simulacion')
        .delete()
        .eq('id_simulacion', id)
        .in('profile_id', toRemove)

      if (delErr) return res.status(400).json({ error: delErr.message })
    }

    // A agregar
    const toAdd = profile_ids.filter((nid) => !currentIds.includes(nid))
    if (toAdd.length > 0) {
      const rows = toAdd.map((pid) => ({
        id_simulacion: Number(id),
        profile_id: pid,
        rol_practica: 'participante',
        estado: 'pendiente',
        fecha_asignacion: new Date().toISOString(),
      }))

      const { error: insErr } = await supabaseAdmin
        .from('participante_simulacion')
        .insert(rows)

      if (insErr) return res.status(400).json({ error: insErr.message })
    }

    return res.json({ message: 'Asignaciones actualizadas exitosamente', total: profile_ids.length })
  } catch (err) {
    console.error('PUT /api/simulaciones/:id/assign:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// DELETE /api/simulaciones/:id/assign/:profileId — quitar asignación (HUL03)
router.delete('/:id/assign/:profileId', async (req, res) => {
  try {
    const { id, profileId } = req.params

    const { error } = await supabaseAdmin
      .from('participante_simulacion')
      .delete()
      .eq('id_simulacion', id)
      .eq('profile_id', profileId)

    if (error) return res.status(400).json({ error: error.message })

    return res.json({ message: 'Participante desasignado exitosamente' })
  } catch (err) {
    console.error('DELETE /api/simulaciones/:id/assign/:profileId:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

export default router
