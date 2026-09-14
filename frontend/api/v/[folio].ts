import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
const supabaseKey = (process.env.SUPABASE_KEY ?? '').trim()
const normalizedUrl =
  supabaseUrl && !/^https?:\/\//i.test(supabaseUrl)
    ? `https://${supabaseUrl}`
    : supabaseUrl

let supabase: SupabaseClient | null = null
let ENV_ERROR: string | null = null

if (!supabaseUrl || !supabaseKey) {
  ENV_ERROR = 'Faltan env vars de Vercel: SUPABASE_URL y SUPABASE_KEY'
} else {
  try {
    supabase = createClient(normalizedUrl, supabaseKey)
  } catch (e) {
    ENV_ERROR = `SUPABASE_URL inválida: ${(e as Error).message}`
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: ENV_ERROR })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const folio = req.query.folio as string

    const { data: doc, error } = await supabase
      .from('documents')
      .select('file_url')
      .eq('folio', folio)
      .single()

    if (error || !doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    res.redirect(doc.file_url)
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message })
  }
}