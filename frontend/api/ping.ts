import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.json({
    ok: true,
    node: process.version,
    urlLength: (process.env.SUPABASE_URL ?? '').length,
    keyLength: (process.env.SUPABASE_KEY ?? '').length,
  })
}