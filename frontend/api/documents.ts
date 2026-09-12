import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Readable } from 'stream'
import crypto from 'node:crypto'
import busboy from 'busboy'
import { supabase } from './_lib/supabase'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb',
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleList(res)
  }

  if (req.method === 'POST') {
    return handleUpload(req, res)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleList(res: VercelResponse) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.json(data)
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message })
  }
}

async function handleUpload(req: VercelRequest, res: VercelResponse) {
  try {
    const buffer = await readBody(req)
    const { title, folio, filename, fileBuffer } = await parseMultipart(req.headers, buffer)

    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let finalFolio = folio?.trim()
    if (!finalFolio) {
      const year = new Date().getFullYear()
      const rand = crypto.randomUUID().slice(0, 8).toUpperCase()
      finalFolio = `FOL-${year}-${rand}`
    }

    const safeName = (filename || 'file.pdf')
      .replace(/[/\\]/g, '_')
      .replace(/\s+/g, '_')
    const fileName = `${Date.now()}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (storageError) throw storageError

    const { data: { publicUrl } } = supabase.storage
      .from('pdfs')
      .getPublicUrl(fileName)

    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert([{ title, folio: finalFolio, file_url: publicUrl, file_name: fileName }])
      .select()

    if (dbError) throw dbError

    return res.status(201).json(dbData[0])
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: (error as Error).message })
  }
}

function readBody(req: VercelRequest): Promise<Buffer> {
  const body = req.body as unknown
  if (Buffer.isBuffer(body)) return Promise.resolve(body)
  if (typeof body === 'string') return Promise.resolve(Buffer.from(body))

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

type Parsed = {
  title: string
  folio: string
  filename: string
  fileBuffer: Buffer | null
}

function parseMultipart(
  headers: VercelRequest['headers'],
  buffer: Buffer,
): Promise<Parsed> {
  return new Promise((resolve, reject) => {
    const result: Parsed = { title: '', folio: '', filename: '', fileBuffer: null }

    const bb = busboy({ headers: { ...headers } })

    bb.on('field', (name, value) => {
      if (name === 'title') result.title = value
      if (name === 'folio') result.folio = value
    })

    bb.on('file', (name, stream, info) => {
      result.filename = info.filename
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      stream.on('end', () => {
        result.fileBuffer = Buffer.concat(chunks)
      })
    })

    bb.on('error', reject)
    bb.on('finish', () => resolve(result))

    Readable.from(buffer).pipe(bb)
  })
}