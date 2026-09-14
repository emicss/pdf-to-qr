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

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const id = req.query.id as string

    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_name')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .remove([doc.file_name])

    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (dbError) throw dbError

    return res.json({ message: 'Document deleted successfully' })
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message })
  }
}