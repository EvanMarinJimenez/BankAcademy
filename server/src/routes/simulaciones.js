import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const router = Router()

// GET /api/simulaciones — listar con filtros
router.get('/', async (req, res) => {
  try {
    const { tipo, estado, search } = req.query

    let query = supabaseAdmin
      .from('simulacion')
      .select('*')
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

// GET /api/simulaciones/:id — obtener una simulación
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data, error } = await supabaseAdmin
      .from('simulacion')
      .select('*')
      .eq('id_simulacion', id)
      .single()

    if (error) return res.status(404).json({ error: 'Simulación no encontrada' })

    return res.json({ simulacion: data })
  } catch (err) {
    console.error('GET /api/simulaciones/:id:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// POST /api/simulaciones — crear escenario (HUL01)
router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      tipo,
      modalidad,
      fecha_inicio,
      fecha_fin,
      creado_por,
    } = req.body

    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'El nombre y el tipo son obligatorios.' })
    }

    const tiposValidos = ['llamada', 'chat', 'mixto']
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` })
    }

    const { data, error } = await supabaseAdmin
      .from('simulacion')
      .insert({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        tipo,
        modalidad: modalidad || 'individual',
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
        estado: 'activa',
        creado_por: creado_por || null,
      })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    return res.status(201).json({ message: 'Escenario creado exitosamente', simulacion: data })
  } catch (err) {
    console.error('POST /api/simulaciones:', err)
    return res.status(500).json({ error: 'Error del servidor' })
  }
})

// PUT /api/simulaciones/:id — modificar escenario (HUL02)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, descripcion, tipo, modalidad, fecha_inicio, fecha_fin, estado } = req.body

    const payload = {}
    if (nombre !== undefined)       payload.nombre      = nombre.trim()
    if (descripcion !== undefined)  payload.descripcion = descripcion.trim()
    if (tipo !== undefined)         payload.tipo        = tipo
    if (modalidad !== undefined)    payload.modalidad   = modalidad
    if (fecha_inicio !== undefined) payload.fecha_inicio = fecha_inicio || null
    if (fecha_fin !== undefined)    payload.fecha_fin    = fecha_fin || null
    if (estado !== undefined)       payload.estado       = estado

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

// PATCH /api/simulaciones/:id/status — cambiar estado (HUL02)
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

export default router
