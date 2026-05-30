'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  ArrowLeft, CheckCircle, AlertCircle, Clock, RefreshCw,
  ChevronDown, ChevronRight, Trash2, Layers, FileText,
  BookOpen, Table2, BookMarked, Cpu,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Document, DocumentProcessingJob, AiExtractionMetadata, DocumentSection, Clause, RequirementMaster, DocumentTable, DocumentDefinition } from '@/lib/types'
import { ExtractionReview } from './ExtractionReview'

const PIPELINE_STAGES = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'queued', label: 'Queued' },
  { key: 'processing', label: 'Processing' },
  { key: 'review_required', label: 'Review required' },
]

const STATUS_ORDER: Record<string, number> = {
  uploaded: 0, queued: 1, processing: 2,
  completed: 3, failed: 3, review_required: 3, published: 3,
}

interface Props {
  doc: Document
  initialJobs: DocumentProcessingJob[]
  canManage: boolean
  extractionMeta: AiExtractionMetadata | null
  extractedSections: DocumentSection[]
  extractedClauses: Clause[]
  extractedRequirements: RequirementMaster[]
  extractedTables: DocumentTable[]
  extractedDefinitions: DocumentDefinition[]
}

export function DocumentDetailClient({ doc, initialJobs, canManage, extractionMeta: initialMeta, extractedSections, extractedClauses, extractedRequirements, extractedTables, extractedDefinitions }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const justUploaded = searchParams.get('uploaded') === '1'

  const [document, setDocument] = useState(doc)
  const [jobs, setJobs] = useState(initialJobs)
  const [extractionMeta, setExtractionMeta] = useState(initialMeta)
  const [processing, setProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [openJobId, setOpenJobId] = useState<string | null>(initialJobs[0]?.id ?? null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [liveEvents, setLiveEvents] = useState<{ id: string; event_type: string; message: string; created_at: string }[]>([])
  const liveLogRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isActivelyProcessing = ['processing', 'queued', 'uploaded'].includes(document.status) || processing

  // Auto-scroll live log to bottom
  useEffect(() => {
    if (liveLogRef.current) {
      liveLogRef.current.scrollTop = liveLogRef.current.scrollHeight
    }
  }, [liveEvents])

  // Poll for updates whenever the document is processing
  useEffect(() => {
    if (!isActivelyProcessing) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    async function poll() {
      const res = await fetch(`/api/jobs?document_id=${doc.id}`)
      if (!res.ok) return
      const { jobs: refreshed } = await res.json()
      if (!refreshed?.length) return

      const latestJob = refreshed[0]
      setJobs(refreshed)
      setOpenJobId(latestJob.id)

      const events = (latestJob.document_processing_events ?? [])
        .slice()
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setLiveEvents(events)

      // Fetch updated document status
      const docRes = await fetch(`/api/document-status?document_id=${doc.id}`)
      if (docRes.ok) {
        const { status, extraction_meta } = await docRes.json()
        setDocument(prev => ({ ...prev, status }))

        if (['review_required', 'failed', 'completed'].includes(status)) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setProcessing(false)
          if (extraction_meta) setExtractionMeta(extraction_meta)
          if (status === 'failed') {
            const errEvent = events.findLast((e: any) => e.event_type === 'error')
            if (errEvent) setProcessingError(errEvent.message)
          }
        }
      }
    }

    poll()
    pollingRef.current = setInterval(poll, 3000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [isActivelyProcessing, doc.id])

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

  async function triggerProcessing() {
    setProcessing(true)
    setProcessingError(null)
    setLiveEvents([])
    setDocument(prev => ({ ...prev, status: 'processing' }))

    const res = await fetch('/api/process-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: doc.id }),
    })

    if (!res.ok) {
      const data = await res.json()
      setProcessingError(data.error ?? 'Processing failed')
      setDocument(prev => ({ ...prev, status: 'failed' }))
      setProcessing(false)
    }
    // On success, polling loop takes over and updates state
  }

  const currentStageIdx = STATUS_ORDER[document.status] ?? 0
  const isFailed = document.status === 'failed'
  const isReviewReady = ['review_required', 'completed', 'published'].includes(document.status)
  const canReprocess = (isFailed || isReviewReady) && !processing
  const showExtractionPanel = isReviewReady && extractionMeta

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
      {justUploaded && !isActivelyProcessing && (
        <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Upload complete</p>
            <p className="text-xs text-green-700 mt-0.5">AI extraction is running in the background.</p>
          </div>
        </div>
      )}

      {/* Processing error */}
      {processingError && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Processing failed</p>
            <p className="text-xs text-red-700 mt-0.5">{processingError}</p>
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
            {canReprocess && (
              <Button variant="secondary" onClick={triggerProcessing} disabled={processing}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${processing ? 'animate-spin' : ''}`} />
                {isFailed ? 'Retry' : 'Reprocess'}
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
              const done = currentStageIdx > idx || (isReviewReady && idx === 3)
              const active = currentStageIdx === idx && !isFailed && !isReviewReady
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
                       active ? <Clock className="h-4 w-4 animate-pulse" /> :
                       idx + 1}
                    </div>
                    <p className={`text-xs mt-1.5 font-medium text-center leading-tight ${
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

      {/* Live progress panel */}
      {isActivelyProcessing && (
        <Card className="mb-6 border-blue-200 bg-blue-50/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="h-4 w-4 text-[#007ea7] animate-pulse" />
              <p className="text-sm font-medium text-[#003459]">AI extraction in progress</p>
              <span className="text-xs text-gray-400">— you can navigate away, this runs in the background</span>
            </div>
            <div
              ref={liveLogRef}
              className="bg-[#00171f] rounded-lg px-4 py-3 h-48 overflow-y-auto font-mono text-xs space-y-1"
            >
              {liveEvents.length === 0 ? (
                <p className="text-gray-500">Waiting for pipeline to start…</p>
              ) : (
                liveEvents.map((evt, i) => (
                  <div key={evt.id ?? i} className="flex items-start gap-2">
                    <span className="text-gray-500 flex-shrink-0">
                      {new Date(evt.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`flex-shrink-0 ${
                      evt.event_type === 'error' ? 'text-red-400' :
                      evt.event_type === 'success' ? 'text-green-400' :
                      'text-[#00a8e8]'
                    }`}>›</span>
                    <span className={
                      evt.event_type === 'error' ? 'text-red-300' :
                      evt.event_type === 'success' ? 'text-green-300' :
                      'text-gray-200'
                    }>{evt.message}</span>
                  </div>
                ))
              )}
              {/* Blinking cursor */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500">
                  {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-[#00a8e8]">›</span>
                <span className="inline-block w-2 h-3.5 bg-[#007ea7] animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extraction results panel */}
      {showExtractionPanel && (
        <Card className="mb-6 border-green-200 bg-green-50/30">
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Extraction results</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Cpu className="h-3.5 w-3.5" />
                <span>{extractionMeta.model_name}</span>
                {extractionMeta.overall_confidence != null && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    extractionMeta.overall_confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                    extractionMeta.overall_confidence >= 0.6 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round(extractionMeta.overall_confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <ExtractionStat icon={<Layers className="h-4 w-4" />} label="Sections" value={extractionMeta.sections_count} />
              <ExtractionStat icon={<FileText className="h-4 w-4" />} label="Clauses" value={extractionMeta.clauses_count} />
              <ExtractionStat icon={<BookOpen className="h-4 w-4" />} label="Requirements" value={extractionMeta.requirements_count} />
              <ExtractionStat icon={<Table2 className="h-4 w-4" />} label="Tables" value={extractionMeta.tables_count} />
              <ExtractionStat icon={<BookMarked className="h-4 w-4" />} label="Definitions" value={extractionMeta.definitions_count} />
            </div>
            {extractionMeta.extraction_notes && (
              <p className="mt-3 text-xs text-gray-500 italic">{extractionMeta.extraction_notes}</p>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Extracted content review */}
      {isReviewReady && (
        <ExtractionReview
          sections={extractedSections}
          clauses={extractedClauses}
          requirements={extractedRequirements}
          tables={extractedTables}
          definitions={extractedDefinitions}
        />
      )}

      {/* Job history */}
      <div className="mt-8">
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
                              <span className={`font-medium px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide flex-shrink-0 ${
                                evt.event_type === 'error' ? 'bg-red-100 text-red-700' :
                                evt.event_type === 'success' ? 'bg-green-100 text-green-700' :
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

function ExtractionStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white border border-green-100 rounded-lg px-3 py-3 text-center">
      <div className="flex justify-center text-[#007ea7] mb-1">{icon}</div>
      <p className="text-xl font-bold text-[#003459]">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
