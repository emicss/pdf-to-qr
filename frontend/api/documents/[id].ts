import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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