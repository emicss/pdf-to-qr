import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.SUPABASE_URL?.trim() ?? '').replace(/\/+$/, '')
const supabaseKey = process.env.SUPABASE_KEY?.trim() ?? ''

const normalizedUrl = supabaseUrl && !/^https?:\/\//i.test(supabaseUrl)
  ? `https://${supabaseUrl}`
  : supabaseUrl

let supabase: SupabaseClient | null = null
let ENV_ERROR: string | null = null

if (!normalizedUrl || !supabaseKey) {
  ENV_ERROR =
    'Faltan environment variables de Vercel: SUPABASE_URL y SUPABASE_KEY'
} else {
  try {
    supabase = createClient(normalizedUrl, supabaseKey)
  } catch (e) {
    ENV_ERROR = `SUPABASE_URL inválida en Vercel: ${(e as Error).message}`
  }
}

export { supabase, ENV_ERROR }