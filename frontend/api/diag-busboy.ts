import busboy from 'busboy'
import crypto from 'node:crypto'
import { Readable } from 'stream'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    ok: true,
    busboyType: typeof busboy,
    uuid: crypto.randomUUID().slice(0, 8),
    readable: typeof Readable.from,
    node: process.version,
  })
}