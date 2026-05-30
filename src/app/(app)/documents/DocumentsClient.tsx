'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileText, Plus, Trash2 } from 'lucide-react'
import type { Document } from '@/lib/types'

interface Props {
  initialDocuments: Document[]
  canUpload: boolean
}

export function DocumentsClient({ initialDocuments, canUpload }: Props) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(doc: Document) {
    setDeleting(true)
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id }),
    })
    if (res.ok) {
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    }
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#00171f]">Documents</h1>
          <p className="text-gray-500 text-sm mt-1">Compliance documents uploaded for processing.</p>
        </div>
        {canUpload && (
          <Link href="/documents/upload">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Upload document
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Owner / body</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded by</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!documents.length ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No documents uploaded yet.</p>
                  {canUpload && <p className="text-xs mt-1">Upload your first compliance document to get started.</p>}
                </td>
              </tr>
            ) : documents.map(doc => (
              <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#00171f]">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.file_name}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(doc as any).knowledge_sources?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(doc as any).knowledge_sources?.owner ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(doc as any).knowledge_assets?.version_label ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge status={doc.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {(doc as any).user_profiles?.full_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <Link href={`/documents/${doc.id}`} className="text-[#007ea7] hover:text-[#003459] text-xs font-medium">
                      View
                    </Link>
                    {canUpload && (
                      deleteConfirmId === doc.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600">Delete?</span>
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={deleting}
                            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
