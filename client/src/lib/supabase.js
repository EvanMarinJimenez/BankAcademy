import * as SupabaseModule from '@supabase/supabase-js'

const createClient =
  SupabaseModule.createClient ||
  (typeof SupabaseModule === 'function' ? SupabaseModule : null)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
