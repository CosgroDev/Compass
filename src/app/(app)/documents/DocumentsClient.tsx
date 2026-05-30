'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FileText, Plus } from 'lucide-react'
import type { Document } from '@/lib/types'

interface Props {
  initialDocuments: Document[]
  canUpload: boolean
}

export function DocumentsClient({ initialDocuments, canUpload }: Props) {
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded by</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!initialDocuments.length ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No documents uploaded yet.</p>
                  {canUpload && <p className="text-xs mt-1">Upload your first compliance document to get started.</p>}
                </td>
              </tr>
            ) : initialDocuments.map(doc => (
              <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#00171f]">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.file_name}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(doc as any).knowledge_sources?.name ?? '—'}
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
                  <Link href={`/documents/${doc.id}`} className="text-[#007ea7] hover:text-[#003459] text-xs font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
