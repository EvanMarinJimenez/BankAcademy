import { Router } from 'express'
import { supabaseAdmin, supabase } from '../lib/supabase.js'

const router = Router()

// Middleware para verificar token JWT de Supabase si se envía
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización no proporcionado' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(500).json({ error: 'Error al verificar autenticación' })
  }
}

// GET /api/users - Listar usuarios con filtros
router.get('/', async (req, res) => {
  try {
    const { status, role, search } = req.query

    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('is_active', status === 'active')
    }

    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.json({ users: data })
  } catch (err) {
    console.error('Error in GET /api/users:', err)
    return res.status(500).json({ error: 'Error del servidor al obtener usuarios' })
  }
})

// POST /api/users - Crear usuario desde el panel admin (HUU02)
router.post('/', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, role = 'participant' } = req.body

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Nombre, apellido, email y contraseña son obligatorios' })
    }

    // 1. Crear el usuario en auth.users con supabaseAdmin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone: phone || '',
        role,
      },
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // 2. Asegurar que el perfil tenga los datos completos (por si el trigger tarda o necesita campos extras)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        phone: phone || '',
        role,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) {
      console.warn('Warning upserting profile:', profileError)
    }

    return res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: profile || authData.user,
    })
  } catch (err) {
    console.error('Error in POST /api/users:', err)
    return res.status(500).json({ error: 'Error del servidor al crear usuario' })
  }
})

// PUT /api/users/:id - Modificar información del usuario (HUU03)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { first_name, last_name, phone, role, is_active, password } = req.body

    const updatePayload = {}
    if (first_name !== undefined) updatePayload.first_name = first_name
    if (last_name !== undefined) updatePayload.last_name = last_name
    if (phone !== undefined) updatePayload.phone = phone
    if (role !== undefined) updatePayload.role = role
    if (is_active !== undefined) updatePayload.is_active = is_active

    // Actualizar tabla profiles
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (profileError) {
      return res.status(400).json({ error: profileError.message })
    }

    // Si se especificó nueva contraseña o cambio en auth metadata
    const authUpdate = {
      user_metadata: {
        ...(first_name ? { first_name } : {}),
        ...(last_name ? { last_name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(role ? { role } : {}),
      },
    }
    if (password && password.length >= 6) {
      authUpdate.password = password
    }

    await supabaseAdmin.auth.admin.updateUserById(id, authUpdate)

    return res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedProfile,
    })
  } catch (err) {
    console.error('Error in PUT /api/users/:id:', err)
    return res.status(500).json({ error: 'Error del servidor al actualizar usuario' })
  }
})

// PATCH /api/users/:id/status - Activar/Desactivar participante (HUU04)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { is_active } = req.body

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser un booleano (true/false)' })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    return res.json({
      message: is_active ? 'Usuario activado exitosamente' : 'Usuario desactivado exitosamente',
      user: data,
    })
  } catch (err) {
    console.error('Error in PATCH /api/users/:id/status:', err)
    return res.status(500).json({ error: 'Error del servidor al cambiar estado de usuario' })
  }
})

export default router
