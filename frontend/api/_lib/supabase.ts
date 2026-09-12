import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? ''
const supabaseKey = process.env.SUPABASE_KEY?.trim() ?? ''

export const ENV_ERROR =
  supabaseUrl && supabaseKey
    ? null
    : 'Faltan environment variables de Vercel: SUPABASE_URL y SUPABASE_KEY'

export const supabase: SupabaseClient | null = ENV_ERROR
  ? null
  : createClient(supabaseUrl, supabaseKey)