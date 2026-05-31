'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Sparkles, ChevronRight, AlertCircle, BookOpen, Loader2, X, SlidersHorizontal, Check } from 'lucide-react'
import type { ScopeDocument } from './page'

const TYPE_COLOURS: Record<string, string> = {
  requirement: 'bg-blue-100 text-blue-700',
  record: 'bg-purple-100 text-purple-700',
  monitoring: 'bg-amber-100 text-amber-700',
  verification: 'bg-green-100 text-green-700',
  validation: 'bg-teal-100 text-teal-700',
  training: 'bg-orange-100 text-orange-700',
}

interface SearchResult {
  id: string
  requirement_text: string
  requirement_type: string | null
  confidence_score: number | null
  match_type: 'keyword' | 'semantic' | 'both'
  similarity: number
  clause_number: string | null
  clause_text: string | null
  document_id: string
  document_title: string | null
  source_name: string | null
  version_label: string | null
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  ai_summary: { text: string; citations: string[] } | null
}

interface Props {
  scopeDocuments: ScopeDocument[]
}

const EXAMPLE_QUERIES = [
  'Environmental monitoring programme',
  'Allergen management requirements',
  'HACCP critical control points',
  'Supplier approval and monitoring',
  'Traceability and recall procedures',
]

export function SearchClient({ scopeDocuments }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Derive unique sources from available docs
  const sources = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of scopeDocuments) map.set(d.source_id, d.source_name)
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [scopeDocuments])

  // Parse initial selections from URL
  const initialDocIds = useMemo(() => {
    const raw = searchParams.get('docs')
    return raw ? raw.split(',').filter(Boolean) : []
  }, [])

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set(initialDocIds))
  const [scopeOpen, setScopeOpen] = useState(initialDocIds.length > 0)
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [aiSummary, setAiSummary] = useState<{ text: string; citations: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-run search if URL has query param on mount
  useEffect(() => {
    const q = searchParams.get('q')
    if (q?.trim()) {
      const docIds = searchParams.get('docs')?.split(',').filter(Boolean) ?? []
      runSearch(q, new Set(docIds))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSearch(searchQuery: string, docIds: Set<string>) {
    setLoading(true)
    setError(null)
    setResponse(null)
    setShowSummary(false)
    setAiSummary(null)

    try {
      const body: any = { query: searchQuery, include_summary: false }
      if (docIds.size > 0) body.document_ids = Array.from(docIds)

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')
      setResponse(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function buildUrl(q: string, docIds: Set<string>) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (docIds.size > 0) params.set('docs', Array.from(docIds).join(','))
    return `/search${params.size ? '?' + params.toString() : ''}`
  }

  async function handleSearch(q?: string) {
    const searchQuery = (q ?? query).trim()
    if (!searchQuery) return
    if (q) setQuery(q)
    router.replace(buildUrl(searchQuery, selectedDocIds), { scroll: false })
    await runSearch(searchQuery, selectedDocIds)
  }

  async function handleSummary() {
    if (!response?.query) return
    setSummaryLoading(true)
    setShowSummary(true)
    try {
      const body: any = { query: response.query, include_summary: true }
      if (selectedDocIds.size > 0) body.document_ids = Array.from(selectedDocIds)
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) setAiSummary(data.ai_summary)
    } catch {
      // best-effort
    } finally {
      setSummaryLoading(false)
    }
  }

  function toggleDoc(id: string) {
    setSelectedDocIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSource(sourceId: string) {
    const sourceDocs = scopeDocuments.filter(d => d.source_id === sourceId).map(d => d.id)
    const allSelected = sourceDocs.every(id => selectedDocIds.has(id))
    setSelectedDocIds(prev => {
      const next = new Set(prev)
      if (allSelected) sourceDocs.forEach(id => next.delete(id))
      else sourceDocs.forEach(id => next.add(id))
      return next
    })
  }

  function clearScope() {
    setSelectedDocIds(new Set())
  }

  const scopeLabel = useMemo(() => {
    if (selectedDocIds.size === 0) return 'All sources'
    if (selectedDocIds.size === scopeDocuments.length) return 'All sources'
    const selDocs = scopeDocuments.filter(d => selectedDocIds.has(d.id))
    const srcNames = [...new Set(selDocs.map(d => d.source_name))]
    if (srcNames.length === 1 && selDocs.length === scopeDocuments.filter(d => d.source_name === srcNames[0]).length) {
      return srcNames[0]
    }
    return `${selectedDocIds.size} document${selectedDocIds.size !== 1 ? 's' : ''} selected`
  }, [selectedDocIds, scopeDocuments])

  const hasScope = selectedDocIds.size > 0 && selectedDocIds.size < scopeDocuments.length
  const hasResults = response && response.results.length > 0
  const noResults = response && response.results.length === 0

  return (
    <div>
      {/* Page header */}
      <div className={`transition-all ${hasResults || noResults ? 'mb-6' : 'mb-8 mt-6 text-center'}`}>
        {!hasResults && !noResults && (
          <>
            <h1 className="text-3xl font-semibold text-[#00171f] mb-2">Search requirements</h1>
            <p className="text-gray-500 text-sm mb-6">
              Ask a question or search by keyword across your published requirements.
            </p>
          </>
        )}
        {(hasResults || noResults) && (
          <h1 className="text-lg font-semibold text-[#00171f]">Search results</h1>
        )}
      </div>

      {/* Scope + Search */}
      <div className={`${!hasResults && !noResults ? 'max-w-2xl mx-auto' : ''} mb-6 space-y-2`}>

        {/* Scope panel toggle */}
        {scopeDocuments.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setScopeOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-600">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="font-medium">Scope:</span>
                <span className={hasScope ? 'text-[#007ea7] font-medium' : 'text-gray-400'}>{scopeLabel}</span>
              </div>
              <span className="text-xs text-gray-400">{scopeOpen ? 'Hide' : 'Customise'}</span>
            </button>

            {scopeOpen && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">Select the sources and documents to search within.</p>
                  {hasScope && (
                    <button onClick={clearScope} className="text-xs text-gray-400 hover:text-gray-600 underline">
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {sources.map(([srcId, srcName]) => {
                    const srcDocs = scopeDocuments.filter(d => d.source_id === srcId)
                    const allSelected = srcDocs.every(d => selectedDocIds.has(d.id))
                    const someSelected = srcDocs.some(d => selectedDocIds.has(d.id))
                    return (
                      <div key={srcId}>
                        {/* Source row */}
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                          <span
                            onClick={() => toggleSource(srcId)}
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                              allSelected
                                ? 'bg-[#003459] border-[#003459]'
                                : someSelected
                                ? 'bg-[#007ea7]/20 border-[#007ea7]'
                                : 'border-gray-300 group-hover:border-[#007ea7]'
                            }`}
                          >
                            {allSelected && <Check className="h-2.5 w-2.5 text-white" />}
                            {someSelected && !allSelected && <span className="w-2 h-0.5 bg-[#007ea7] rounded" />}
                          </span>
                          <span
                            onClick={() => toggleSource(srcId)}
                            className="text-sm font-medium text-[#00171f] cursor-pointer"
                          >
                            {srcName}
                          </span>
                        </label>
                        {/* Document rows */}
                        <div className="ml-6 mt-1.5 space-y-1.5">
                          {srcDocs.map(doc => (
                            <label key={doc.id} className="flex items-center gap-2.5 cursor-pointer group">
                              <span
                                onClick={() => toggleDoc(doc.id)}
                                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                                  selectedDocIds.has(doc.id)
                                    ? 'bg-[#007ea7] border-[#007ea7]'
                                    : 'border-gray-300 group-hover:border-[#007ea7]'
                                }`}
                              >
                                {selectedDocIds.has(doc.id) && <Check className="h-2.5 w-2.5 text-white" />}
                              </span>
                              <span onClick={() => toggleDoc(doc.id)} className="text-sm text-gray-700 cursor-pointer">
                                {doc.title}
                                {doc.version_label && (
                                  <span className="text-xs text-gray-400 ml-1.5">({doc.version_label})</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={e => { e.preventDefault(); handleSearch() }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={hasScope ? `Search within ${scopeLabel}…` : 'e.g. environmental monitoring, allergen controls, HACCP…'}
              className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007ea7]/30 focus:border-[#007ea7] bg-white"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setResponse(null)
                  setError(null)
                  router.replace(buildUrl('', selectedDocIds), { scroll: false })
                  inputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-5 py-3 bg-[#003459] text-white text-sm font-medium rounded-lg hover:bg-[#002744] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>

        {/* Example queries */}
        {!hasResults && !noResults && !loading && (
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {EXAMPLE_QUERIES.map(q => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#007ea7] hover:text-[#007ea7] transition-colors bg-white"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-4 animate-pulse">
              <div className="flex gap-2 mb-2">
                <div className="h-4 w-12 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-12 text-center">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No requirements found</p>
          <p className="text-xs text-gray-400">
            {hasScope
              ? `No requirements found within ${scopeLabel} matching "${response?.query}".`
              : `The approved knowledge base does not contain requirements matching "${response?.query}".`}
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              <span className="font-medium text-[#00171f]">{response.total}</span> requirement{response.total !== 1 ? 's' : ''} found
              {hasScope && <span className="text-gray-400"> within {scopeLabel}</span>}
              {' '}for &ldquo;{response.query}&rdquo;
            </p>
            {!showSummary && (
              <button
                onClick={handleSummary}
                className="flex items-center gap-1.5 text-xs font-medium text-[#007ea7] hover:text-[#003459] border border-[#007ea7]/30 rounded-full px-3 py-1.5 hover:bg-[#007ea7]/5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI summary
              </button>
            )}
          </div>

          {/* AI Summary panel */}
          {showSummary && (
            <div className="bg-[#f0f9ff] border border-[#007ea7]/20 rounded-lg px-5 py-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[#007ea7]" />
                <p className="text-xs font-semibold text-[#007ea7] uppercase tracking-wide">AI-generated summary</p>
                <span className="text-[10px] text-gray-400 ml-auto">Based on approved requirements only · Always verify against source</span>
              </div>
              {summaryLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-[#007ea7]/10 rounded w-full" />
                  <div className="h-3.5 bg-[#007ea7]/10 rounded w-5/6" />
                  <div className="h-3.5 bg-[#007ea7]/10 rounded w-4/6" />
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-[#00171f] leading-relaxed whitespace-pre-wrap">{aiSummary.text}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Summary unavailable.</p>
              )}
            </div>
          )}

          {/* Result cards */}
          <div className="space-y-2">
            {response.results.map(result => (
              <Link key={result.id} href={`/requirements/${result.id}`}>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 hover:border-[#007ea7]/40 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {result.clause_number && (
                          <span className="text-xs font-mono font-semibold text-white bg-[#003459] px-2 py-0.5 rounded">
                            {result.clause_number}
                          </span>
                        )}
                        {result.requirement_type && (
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_COLOURS[result.requirement_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {result.requirement_type}
                          </span>
                        )}
                        {result.match_type === 'semantic' && (
                          <span className="text-[10px] text-[#007ea7] font-medium flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            Semantic match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#00171f] leading-relaxed">{result.requirement_text}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {result.source_name && <span>{result.source_name}</span>}
                        {result.source_name && result.document_title && <span className="mx-1">·</span>}
                        {result.document_title && <span>{result.document_title}</span>}
                        {result.version_label && <span className="ml-1 text-gray-300">({result.version_label})</span>}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#007ea7] flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
