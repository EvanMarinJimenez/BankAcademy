import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Obtener perfil del usuario desde la tabla profiles
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data
  }

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const prof = await fetchProfile(session.user.id)
        setProfile(prof)
      }
      setLoading(false)
    })

    // Escuchar cambios de auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          const prof = await fetchProfile(session.user.id)
          setProfile(prof)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Login con email y password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { data, error }

    if (data?.user) {
      const prof = await fetchProfile(data.user.id)
      if (prof && prof.is_active === false) {
        await supabase.auth.signOut()
        return {
          data: null,
          error: { message: 'Tu cuenta ha sido desactivada. Por favor, contacta a un administrador.' }
        }
      }
      setProfile(prof)
    }

    return { data, error }
  }

  // Registro
  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // first_name, last_name, role, phone
      },
    })
    return { data, error }
  }

  // Actualizar perfil de usuario
  const updateProfile = async (updates) => {
    if (!session?.user?.id) return { error: { message: 'No hay sesión activa' } }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }
    return { data, error }
  }

  // Cerrar sesión
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setSession(null)
      setProfile(null)
    }
    return { error }
  }

  // Recuperar contraseña
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  // Actualizar contraseña
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    fetchProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
