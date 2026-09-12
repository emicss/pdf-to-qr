import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase, ENV_ERROR } from '../_lib/supabase'

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