import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = (process.env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
    const key = (process.env.SUPABASE_KEY ?? '').trim()
    const sb = createClient(url, key)

    const { data, error } = await sb.from('documents').select('id').limit(1)

    res.json({
      ok: true,
      queryError: error?.message ?? null,
      rows: data?.length ?? 0,
      node: process.version,
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: String((e as Error)?.message ?? e) })
  }
}