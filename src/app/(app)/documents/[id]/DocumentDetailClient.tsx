'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ArrowLeft, CheckCircle, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Document, DocumentProcessingJob } from '@/lib/types'

const PIPELINE_STAGES = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'queued', label: 'Queued' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
]

const STATUS_ORDER: Record<string, number> = {
  uploaded: 0, queued: 1, processing: 2,
  completed: 3, failed: 3, review_required: 3, published: 4,
}

interface Props {
  doc: Document
  initialJobs: DocumentProcessingJob[]
  canManage: boolean
}

export function DocumentDetailClient({ doc, initialJobs, canManage }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const justUploaded = searchParams.get('uploaded') === '1'
  const supabase = createClient()

  const [document, setDocument] = useState(doc)
  const [jobs, setJobs] = useState(initialJobs)
  const [reprocessing, setReprocessing] = useState(false)
  const [openJobId, setOpenJobId] = useState<string | null>(initialJobs[0]?.id ?? null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id }),
    })
    if (res.ok) router.push('/documents')
    else setDeleting(false)
  }

  async function handleReprocess() {
    setReprocessing(true)
    await supabase.from('document_processing_jobs').insert({
      document_id: doc.id,
      job_type: 'full_pipeline',
      status: 'queued',
    })
    await supabase.from('documents').update({ status: 'queued' }).eq('id', doc.id)

    const { data: updated } = await supabase
      .from('document_processing_jobs')
      .select('*, document_processing_events(*)')
      .eq('document_id', doc.id)
      .order('created_at', { ascending: false })

    if (updated) { setJobs(updated); setOpenJobId(updated[0]?.id ?? null) }
    setDocument(prev => ({ ...prev, status: 'queued' }))
    setReprocessing(false)
  }

  const currentStageIdx = STATUS_ORDER[document.status] ?? 0
  const isFailed = document.status === 'failed'
  const isCompleted = ['completed', 'published'].includes(document.status)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/documents" className="flex items-center gap-1 text-[#007ea7] hover:text-[#003459]">
          <ArrowLeft className="h-4 w-4" />
          Documents
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{document.title}</span>
      </div>

      {/* Upload success banner */}
      {justUploaded && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Upload complete</p>
            <p className="text-xs text-green-700 mt-0.5">Document processing is in progress. This page will show the job status below.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-[#00171f]">{document.title}</h1>
            <Badge status={document.status} />
          </div>
          <p className="text-sm text-gray-500">{document.file_name}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {(document as any).knowledge_sources?.name && (
              <span>Source: <span className="font-medium text-[#00171f]">{(document as any).knowledge_sources.name}</span></span>
            )}
            {(document as any).knowledge_assets?.version_label && (
              <span>Version: <span className="font-medium text-[#00171f]">{(document as any).knowledge_assets.version_label}</span></span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {(isFailed || isCompleted) && (
              <Button variant="secondary" onClick={handleReprocess} disabled={reprocessing}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${reprocessing ? 'animate-spin' : ''}`} />
                Reprocess
              </Button>
            )}
            {deleteConfirm ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm text-red-700">Delete this document?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-1.5 text-red-500" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pipeline stages */}
      <Card className="mb-6">
        <CardContent className="py-5">
          <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">Processing pipeline</p>
          <div className="flex items-center gap-0">
            {PIPELINE_STAGES.map((stage, idx) => {
              const done = currentStageIdx > idx || (isCompleted && idx === 3)
              const active = currentStageIdx === idx && !isFailed
              const failed = isFailed && idx === currentStageIdx

              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done ? 'bg-green-500 text-white' :
                      failed ? 'bg-red-500 text-white' :
                      active ? 'bg-[#007ea7] text-white ring-4 ring-[#007ea7]/20' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? <CheckCircle className="h-4 w-4" /> :
                       failed ? <AlertCircle className="h-4 w-4" /> :
                       active ? <Clock className="h-4 w-4" /> :
                       idx + 1}
                    </div>
                    <p className={`text-xs mt-1.5 font-medium ${
                      done ? 'text-green-600' :
                      failed ? 'text-red-600' :
                      active ? 'text-[#007ea7]' :
                      'text-gray-400'
                    }`}>{stage.label}</p>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 -mt-5 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">File type</p>
            <p className="text-lg font-bold text-[#003459] uppercase">{document.file_type}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">File size</p>
            <p className="text-lg font-bold text-[#003459]">
              {document.file_size_bytes
                ? document.file_size_bytes < 1024 * 1024
                  ? `${(document.file_size_bytes / 1024).toFixed(1)} KB`
                  : `${(document.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Uploaded</p>
            <p className="text-lg font-bold text-[#003459]">
              {new Date(document.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job history */}
      <div>
        <h2 className="text-lg font-semibold text-[#00171f] mb-4">Processing history</h2>
        {!jobs.length ? (
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center text-gray-400 text-sm">
            No processing jobs yet.
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job, idx) => (
              <div key={job.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenJobId(openJobId === job.id ? null : job.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-sm"
                >
                  <div className="flex items-center gap-3">
                    {openJobId === job.id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <span className="font-medium text-[#00171f]">
                      Job {jobs.length - idx} — {job.job_type.replace(/_/g, ' ')}
                    </span>
                    <Badge status={job.status} />
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>

                {openJobId === job.id && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    {job.error_message && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">{job.error_message}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      {(job as any).document_processing_events?.length ? (
                        [...(job as any).document_processing_events]
                          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map((evt: any) => (
                            <div key={evt.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
                              <span className="text-gray-400 whitespace-nowrap">
                                {new Date(evt.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <span className={`font-medium px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                                evt.event_type === 'error' ? 'bg-red-100 text-red-700' :
                                evt.event_type === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{evt.event_type}</span>
                              <span className="text-gray-600">{evt.message}</span>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-gray-400 py-2">No events recorded for this job.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
