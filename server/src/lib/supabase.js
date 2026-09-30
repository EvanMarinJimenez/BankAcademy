import { createClient } from '@supabase/supabase-js'

// Cliente con anon key (respeta RLS)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Cliente con service role key (bypasea RLS - solo para operaciones admin del server)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
