import { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { EyeIcon, ClipboardIcon, TrashIcon } from 'lucide-react'

interface Document {
  id: string
  folio: string
  title: string
  file_url: string
  file_name: string
  size_bytes?: number
  created_at?: string
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentFolio, setDocumentFolio] = useState('')
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data)
    } catch (err) {
      console.error('Error fetching documents:', err)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileInputRef.current?.files?.[0]) return

    const file = fileInputRef.current.files[0]
    const formData = new FormData()
    formData.append('pdf', file)
    formData.append('title', documentTitle)
    formData.append('folio', documentFolio)

    setUploadStatus('uploading')
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        data = { error: `Error del servidor (HTTP ${res.status})` }
      }
      if (res.ok) {
        setUploadStatus('success')
        fetchDocuments()
        resetUploadForm()
      } else {
        setUploadStatus('error')
        alert(data.error || `Error al subir (HTTP ${res.status})`)
      }
    } catch (err) {
      setUploadStatus('error')
      console.error(err)
      alert('Error de red al subir el archivo')
    }
  }

  const resetUploadForm = () => {
    setDocumentTitle('')
    setDocumentFolio('')
    setUploadStatus('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const copyLink = async (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        fetchDocuments()
      } else {
        alert(data.error || 'Error al eliminar')
      }
    } catch (err) {
      console.error(err)
    }
    setSelectedDoc(null)
  }

  const downloadQrPng = (folio: string) => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${folio}.png`
    a.click()
  }

  const filteredDocuments = documents.filter((doc) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return doc.folio.toLowerCase().includes(q) || doc.title.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <header className="border-b border-border bg-background p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Sistema de Gestión de PDFs</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio o nombre..."
              className="input-field"
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-primary">
              + Subir nuevo PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {uploadStatus === 'uploading' && (
          <div className="mt-4 p-4 bg-primary/10 rounded border border-primary/50">
            <p className="text-sm">Subiendo archivo...</p>
            <div className="w-full bg-border rounded h-2 mt-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${Math.random() * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="mt-6 max-w-2xl mx-auto">
          <div className="p-5 bg-background rounded border border-border">
            <h2 className="font-semibold mb-4">Subir PDF</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Archivo PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  ref={fileInputRef}
                  className="file-input"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Arrastra y suelta un archivo PDF aquí o haz clic para seleccionar
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Título / Nombre</label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="input-field"
                  placeholder="Ej: Informe mensual - Septiembre 2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Folio (opcional)</label>
                <input
                  type="text"
                  value={documentFolio}
                  onChange={(e) => setDocumentFolio(e.target.value)}
                  className="input-field"
                  placeholder="Se generará automáticamente si queda vacío"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si queda vacío, se generará un folio UUID automáticamente
                </p>
              </div>
              <div>
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={uploadStatus !== 'idle'}
                >
                  {uploadStatus === 'uploading' ? 'Subiendo...' : 'Subir PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-8 max-w-7xl mx-auto">
        {filteredDocuments.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            {search ? 'Sin resultados para tu búsqueda.' : 'No hay documentos registrados. Sube tu primer PDF.'}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left p-4 folio-col">Folio</th>
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Fecha subida</th>
                <th className="text-left p-4">Tamaño</th>
                <th className="text-left p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-b border-border">
                  <td className="p-4 font-medium">{doc.folio}</td>
                  <td className="p-4">
                    <div className="truncate max-w-xs">
                      {doc.title}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-muted-foreground">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    {doc.size_bytes
                      ? `${(doc.size_bytes / 1024 / 1024).toFixed(2)} MB`
                      : 'N/A'}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedDoc(doc); setShowQrModal(true) }}
                        className="btn btn-ghost"
                        title="Ver/Descargar QR"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyLink(doc.file_url)}
                        className="btn btn-ghost"
                        title="Copiar enlace"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedDoc(doc); setShowQrModal(false) }}
                        className="btn btn-destructive"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && showQrModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-6">QR para: {selectedDoc.folio}</h3>
            <div className="mb-8 text-center">
              <QRCodeCanvas
                ref={qrCanvasRef}
                value={`${window.location.origin}/v/${selectedDoc.folio}`}
                size={200}
                bgColor="white"
                fgColor="black"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mb-6">
              Escanea con la cámara de tu smartphone para abrir el PDF
            </p>
            <button
              onClick={() => downloadQrPng(selectedDoc.folio)}
              className="btn btn-primary w-full mb-6"
            >
              Descargar QR (.png)
            </button>
            <div className="mb-6">
              <p className="text-xs text-muted-foreground mb-2">Enlace directo al PDF:</p>
              <div className="relative">
                <input
                  type="text"
                  value={selectedDoc.file_url}
                  readOnly
                  className="input-field w-full pl-4 pr-8"
                />
                <button
                  onClick={() => copyLink(selectedDoc.file_url)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost text-sm"
                  title="Copiar enlace"
                >
                  <ClipboardIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => { setShowQrModal(false); setSelectedDoc(null) }}
              className="btn btn-ghost w-full"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {selectedDoc && !showQrModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg p-6 text-center max-w-sm">
            <p className="text-lg font-medium mb-4">
              ¿Estás seguro de eliminar el documento <strong>{selectedDoc.title}</strong>?
            </p>
            <div className="flex gap-4">
              <button onClick={() => setSelectedDoc(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={() => handleDelete(selectedDoc.id)} className="btn btn-destructive">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App