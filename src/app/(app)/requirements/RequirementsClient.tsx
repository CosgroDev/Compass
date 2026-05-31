'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Search, ChevronRight } from 'lucide-react'
import type { RequirementWithContext } from '@/lib/types'

const TYPE_COLOURS: Record<string, string> = {
  requirement: 'bg-blue-100 text-blue-700',
  record: 'bg-purple-100 text-purple-700',
  monitoring: 'bg-amber-100 text-amber-700',
  verification: 'bg-green-100 text-green-700',
  validation: 'bg-teal-100 text-teal-700',
  training: 'bg-orange-100 text-orange-700',
}

const TYPES = ['requirement', 'record', 'monitoring', 'verification', 'validation', 'training']

interface Props {
  requirements: RequirementWithContext[]
}

export function RequirementsClient({ requirements }: Props) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')

  const filtered = useMemo(() => {
    let r = requirements
    if (selectedType) r = r.filter(req => req.requirement_type === selectedType)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(req =>
        req.requirement_text.toLowerCase().includes(q) ||
        (req.clauses?.clause_number ?? '').toLowerCase().includes(q)
      )
    }
    return r
  }, [requirements, selectedType, search])

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#00171f]">Requirements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {requirements.length} published requirement{requirements.length !== 1 ? 's' : ''} across all documents
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search requirements…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#007ea7]/30 focus:border-[#007ea7]"
          />
        </div>
        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedType('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedType === '' ? 'bg-[#003459] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All types
          </button>
          {TYPES.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? '' : type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                selectedType === type
                  ? (TYPE_COLOURS[type] ?? 'bg-gray-200 text-gray-700') + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(search || selectedType) && (
        <p className="text-xs text-gray-500 mb-3">
          Showing {filtered.length} of {requirements.length} requirements
        </p>
      )}

      {/* Empty states */}
      {requirements.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-12 text-center">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No published requirements yet</p>
          <p className="text-xs text-gray-400">
            Publish documents to see their extracted requirements here.{' '}
            <Link href="/documents" className="text-[#007ea7] hover:underline">Go to documents</Link>
          </p>
        </div>
      )}

      {requirements.length > 0 && filtered.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center text-sm text-gray-400">
          No requirements match your filters.
        </div>
      )}

      {/* Requirements table */}
      {filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Clause</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Source</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(req => (
                <Link key={req.id} href={`/requirements/${req.id}`} legacyBehavior>
                  <tr className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 align-top">
                      {req.clauses?.clause_number ? (
                        <span className="text-xs font-mono font-semibold text-white bg-[#003459] px-2 py-0.5 rounded whitespace-nowrap">
                          {req.clauses.clause_number}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-[#00171f] line-clamp-2 leading-relaxed">{req.requirement_text}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {req.requirement_type && (
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_COLOURS[req.requirement_type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {req.requirement_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-gray-700 line-clamp-2">{(req.documents as any)?.title ?? '—'}</p>
                      {(req.documents as any)?.knowledge_assets?.version_label && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{(req.documents as any).knowledge_assets.version_label}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-gray-500">{(req.documents as any)?.knowledge_sources?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-300">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
