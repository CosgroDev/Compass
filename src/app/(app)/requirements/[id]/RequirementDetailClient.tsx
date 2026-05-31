'use client'

import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import type { RequirementWithContext } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'

const TYPE_COLOURS: Record<string, string> = {
  requirement: 'bg-blue-100 text-blue-700',
  record: 'bg-purple-100 text-purple-700',
  monitoring: 'bg-amber-100 text-amber-700',
  verification: 'bg-green-100 text-green-700',
  validation: 'bg-teal-100 text-teal-700',
  training: 'bg-orange-100 text-orange-700',
}

interface Props {
  requirement: RequirementWithContext
}

export function RequirementDetailClient({ requirement: req }: Props) {
  const clause = req.clauses
  const doc = req.documents as any
  const confidencePct = req.confidence_score != null ? Math.round(req.confidence_score * 100) : null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/requirements" className="flex items-center gap-1 text-[#007ea7] hover:text-[#003459]">
          <ArrowLeft className="h-4 w-4" />
          Requirements
        </Link>
        {clause?.clause_number && (
          <>
            <span className="text-gray-400">/</span>
            <span className="font-mono text-gray-500">{clause.clause_number}</span>
          </>
        )}
      </div>

      {/* Requirement text card */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-5 mb-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {clause?.clause_number && (
            <span className="text-xs font-mono font-semibold text-white bg-[#003459] px-2 py-0.5 rounded">
              {clause.clause_number}
            </span>
          )}
          {req.requirement_type && (
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_COLOURS[req.requirement_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {req.requirement_type}
            </span>
          )}
          {confidencePct != null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              confidencePct >= 80 ? 'bg-green-50 text-green-600' :
              confidencePct >= 60 ? 'bg-amber-50 text-amber-600' :
              'bg-red-50 text-red-600'
            }`}>
              {confidencePct}% confidence
            </span>
          )}
        </div>

        {/* Requirement text */}
        <p className="text-xl font-medium text-[#00171f] leading-relaxed">{req.requirement_text}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clause context */}
        {clause?.clause_text && (
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Source clause</p>
            {clause.clause_number && (
              <p className="text-xs font-mono text-[#007ea7] font-semibold mb-2">{clause.clause_number}</p>
            )}
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-100">
              {clause.clause_text}
            </p>
          </div>
        )}

        {/* Document metadata */}
        <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Document</p>
          <div className="space-y-3">
            {doc?.id && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Title</p>
                <Link href={`/documents/${doc.id}`} className="text-sm font-medium text-[#007ea7] hover:text-[#003459] flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  {doc.title}
                </Link>
              </div>
            )}
            {doc?.knowledge_sources?.name && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Source</p>
                <p className="text-sm text-[#00171f]">{doc.knowledge_sources.name}</p>
              </div>
            )}
            {doc?.knowledge_assets && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Version</p>
                <p className="text-sm text-[#00171f]">{doc.knowledge_assets.title}</p>
                {doc.knowledge_assets.version_label && (
                  <p className="text-xs text-gray-500">{doc.knowledge_assets.version_label}</p>
                )}
              </div>
            )}
            {doc?.status && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                <Badge status={doc.status} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6">
        <Link href="/requirements" className="text-sm text-[#007ea7] hover:text-[#003459] flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to requirements
        </Link>
      </div>
    </div>
  )
}
