'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Upload, FileText, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { KnowledgeSource, KnowledgeAsset } from '@/lib/types'

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/markdown': 'md',
  'text/plain': 'md',
}

interface Props {
  sources: (KnowledgeSource & { knowledge_assets: KnowledgeAsset[] })[]
  tenantId: string
  userId: string
}

export function UploadClient({ sources, tenantId, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedSource = sources.find(s => s.id === selectedSourceId)
  const assets = selectedSource?.knowledge_assets ?? []

  function handleSourceChange(id: string) {
    setSelectedSourceId(id)
    setSelectedAssetId('')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !title) {
      setTitle(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  function removeFile() {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setLoading(true); setError('')

    const fileType = ACCEPTED_TYPES[file.type]
    if (!fileType) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or Markdown file.')
      setLoading(false); return
    }

    const ext = fileType === 'docx' ? 'docx' : fileType === 'pdf' ? 'pdf' : 'md'
    const storagePath = `${tenantId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('source-documents')
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false); return
    }

    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        tenant_id: tenantId,
        knowledge_source_id: selectedSourceId || null,
        knowledge_asset_id: selectedAssetId || null,
        title: title.trim(),
        file_name: file.name,
        file_type: fileType,
        file_size_bytes: file.size,
        storage_path: storagePath,
        status: 'uploaded',
        uploaded_by: userId,
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setLoading(false); return
    }

    // Navigate immediately — processing is triggered server-side
    router.push(`/documents/${doc.id}?uploaded=1`)

    // Trigger AI extraction pipeline (fire and forget — user sees progress on detail page)
    fetch('/api/process-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: doc.id }),
    }).catch(() => {/* background — errors visible on detail page */})
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/documents" className="flex items-center gap-1 text-[#007ea7] hover:text-[#003459]">
          <ArrowLeft className="h-4 w-4" />
          Documents
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">Upload document</span>
      </div>

      <h1 className="text-2xl font-semibold text-[#00171f] mb-6">Upload document</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge source</label>
            <select
              value={selectedSourceId}
              onChange={e => handleSourceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
            >
              <option value="">— Select a source (optional)</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Asset */}
          {selectedSourceId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge asset / version</label>
              <select
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              >
                <option value="">— Select a version (optional)</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.title} — {a.version_label}{a.is_active ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document title <span className="text-red-500">*</span></label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              placeholder="e.g. BRCGS Food Safety Issue 9 — Standard PDF"
            />
          </div>

          {/* File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File <span className="text-red-500">*</span></label>
            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
                <FileText className="h-5 w-5 text-[#007ea7] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#00171f] truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
                <button type="button" onClick={removeFile} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#007ea7] hover:bg-blue-50/30 transition-colors">
                <Upload className="h-8 w-8 text-gray-300 mb-2" />
                <span className="text-sm text-gray-500">Click to select a file</span>
                <span className="text-xs text-gray-400 mt-1">PDF, DOCX, or Markdown — up to 50 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
              </label>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link href="/documents">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading || !file}>
              {loading ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
