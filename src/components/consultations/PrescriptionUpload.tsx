import { useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Upload, Trash2, FileText, Eye, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface PrescriptionUploadProps {
  consultationId: string
  existingFiles: string[]
  onUpdate: (newFiles: string[]) => void
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
}

const extractFileName = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.pathname.split('/').pop() || url
  } catch {
    return url.split('/').pop() || url
  }
}

const getStoragePath = (fileUrl: string) => {
  try {
    const parsed = new URL(fileUrl)
    const match = parsed.pathname.match(/prescriptions\/(.+)$/)
    return match?.[1] || ''
  } catch {
    const match = fileUrl.match(/prescriptions\/(.+)$/)
    return match?.[1] || ''
  }
}

export function PrescriptionUpload({ consultationId, existingFiles, onUpdate }: PrescriptionUploadProps) {
  const [loading, setLoading] = useState(false)
  const [fileSizes, setFileSizes] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleUploadClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed')
      event.target.value = ''
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('PDF file must be 50MB or smaller')
      event.target.value = ''
      return
    }

    setLoading(true)
    try {
      const path = `${consultationId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('prescriptions').getPublicUrl(path)
      if (!urlData?.publicUrl) throw new Error('Failed to get public URL')
      const publicUrl = urlData.publicUrl

      const current = existingFiles ?? []
      const updated = [...current, publicUrl]

      const { error: updateError } = await supabase
        .from('consultations')
        .update({ prescription_images: updated })
        .eq('id', consultationId)

      if (updateError) throw updateError

      setFileSizes((prev) => ({ ...prev, [publicUrl]: formatBytes(file.size) }))
      onUpdate(updated)
      toast.success('Prescription uploaded successfully')
    } catch (err) {
      console.error('Prescription upload error:', err)
      toast.error('Failed to upload prescription')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleDelete = async (fileUrl: string) => {
    setLoading(true)
    try {
      const filePath = getStoragePath(fileUrl)
      if (filePath) {
        const { error: removeError } = await supabase.storage.from('prescriptions').remove([filePath])
        if (removeError) throw removeError
      }

      const updated = existingFiles.filter((url) => url !== fileUrl)
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ prescription_images: updated })
        .eq('id', consultationId)

      if (updateError) throw updateError

      setFileSizes((prev) => {
        const next = { ...prev }
        delete next[fileUrl]
        return next
      })
      onUpdate(updated)
      toast.success('Prescription deleted successfully')
    } catch (err) {
      console.error('Delete prescription error:', err)
      toast.error('Failed to delete prescription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Prescription PDFs</h3>
          <p className="text-xs text-slate-500">Upload, view, or delete prescription documents for this consultation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUploadClick}
            className="btn-primary inline-flex items-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload PDF
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {existingFiles.length === 0 ? (
          <p className="text-sm text-slate-500">No prescription PDFs uploaded yet.</p>
        ) : (
          existingFiles.map((fileUrl) => (
            <div key={fileUrl} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900">{extractFileName(fileUrl)}</p>
                  <p className="text-xs text-slate-500">{fileSizes[fileUrl] ?? 'Size unavailable'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary inline-flex items-center gap-2"
                  title="View prescription"
                >
                  <Eye className="h-4 w-4" />
                  View
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(fileUrl)}
                  className="btn-secondary inline-flex items-center gap-2"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
