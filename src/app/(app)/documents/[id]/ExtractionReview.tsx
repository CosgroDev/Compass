'use client'

import { useState } from 'react'
import { Layers, FileText, BookOpen, Table2, BookMarked, ChevronDown, ChevronRight } from 'lucide-react'
import type { DocumentSection, Clause, RequirementMaster, DocumentTable, DocumentDefinition } from '@/lib/types'

const REQUIREMENT_TYPE_COLOURS: Record<string, string> = {
  requirement: 'bg-blue-100 text-blue-700',
  record: 'bg-purple-100 text-purple-700',
  monitoring: 'bg-amber-100 text-amber-700',
  verification: 'bg-cyan-100 text-cyan-700',
  validation: 'bg-green-100 text-green-700',
  training: 'bg-orange-100 text-orange-700',
  definition: 'bg-gray-100 text-gray-700',
}

type Tab = 'sections' | 'clauses' | 'requirements' | 'tables' | 'definitions'

interface Props {
  sections: DocumentSection[]
  clauses: Clause[]
  requirements: RequirementMaster[]
  tables: DocumentTable[]
  definitions: DocumentDefinition[]
}

export function ExtractionReview({ sections, clauses, requirements, tables, definitions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('requirements')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'requirements', label: 'Requirements', count: requirements.length, icon: <BookOpen className="h-4 w-4" /> },
    { key: 'clauses', label: 'Clauses', count: clauses.length, icon: <FileText className="h-4 w-4" /> },
    { key: 'sections', label: 'Sections', count: sections.length, icon: <Layers className="h-4 w-4" /> },
    { key: 'tables', label: 'Tables', count: tables.length, icon: <Table2 className="h-4 w-4" /> },
    { key: 'definitions', label: 'Definitions', count: definitions.length, icon: <BookMarked className="h-4 w-4" /> },
  ]

  function toggleSection(id: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTable(id: string) {
    setExpandedTables(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Build flat section list with depth indicator
  const rootSections = sections.filter(s => !s.parent_id)

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-[#00171f] mb-4">Extracted content</h2>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-[#007ea7] text-[#007ea7]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
              activeTab === tab.key ? 'bg-[#007ea7]/10 text-[#007ea7]' : 'bg-gray-100 text-gray-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Requirements */}
      {activeTab === 'requirements' && (
        <div className="space-y-2">
          {requirements.length === 0 && <EmptyState label="No requirements extracted" />}
          {requirements.map((req, idx) => {
            const clauseNumber = req.clause_id ? (clauses.find(c => c.id === req.clause_id)?.clause_number ?? null) : null
            // Strip leading clause number prefix from text (e.g. "1.1.2 The site shall..." → "The site shall...")
            const displayText = clauseNumber
              ? req.requirement_text.replace(new RegExp(`^${clauseNumber.replace('.', '\\.')}\\s+`), '')
              : req.requirement_text
            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {clauseNumber && (
                        <span className="text-xs font-mono font-semibold text-white bg-[#003459] px-2 py-0.5 rounded">
                          {clauseNumber}
                        </span>
                      )}
                      {req.requirement_type && (
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${REQUIREMENT_TYPE_COLOURS[req.requirement_type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {req.requirement_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#00171f] leading-relaxed">{displayText}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <ConfidencePill score={req.confidence_score} />
                    <span className="text-xs text-gray-300">#{idx + 1}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Clauses */}
      {activeTab === 'clauses' && (
        <div className="space-y-2">
          {clauses.length === 0 && <EmptyState label="No clauses extracted" />}
          {clauses.map(clause => (
            <div key={clause.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {clause.clause_number && (
                    <p className="text-xs font-semibold text-[#007ea7] mb-1">{clause.clause_number}</p>
                  )}
                  <p className="text-sm text-[#00171f] leading-relaxed">{clause.clause_text}</p>
                </div>
                <ConfidencePill score={clause.confidence_score} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-1">
          {sections.length === 0 && <EmptyState label="No sections extracted" />}
          {rootSections.map(section => (
            <SectionRow
              key={section.id}
              section={section}
              allSections={sections}
              expanded={expandedSections}
              onToggle={toggleSection}
              depth={0}
            />
          ))}
        </div>
      )}

      {/* Tables */}
      {activeTab === 'tables' && (
        <div className="space-y-3">
          {tables.length === 0 && <EmptyState label="No tables extracted" />}
          {tables.map(table => (
            <div key={table.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTable(table.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedTables.has(table.id)
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  <span className="text-sm font-medium text-[#00171f]">
                    Table {table.table_number}{table.caption ? ` — ${table.caption}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{table.structured_json?.headers?.length ?? 0} columns · {table.structured_json?.rows?.length ?? 0} rows</span>
                  <ConfidencePill score={table.confidence_score} />
                </div>
              </button>
              {expandedTables.has(table.id) && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {(table.structured_json?.headers ?? []).map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(table.structured_json?.rows ?? []).map((row, ri) => (
                        <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-gray-700 align-top">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Definitions */}
      {activeTab === 'definitions' && (
        <div className="space-y-2">
          {definitions.length === 0 && <EmptyState label="No definitions extracted" />}
          {definitions.map(def => (
            <div key={def.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#003459] mb-1">{def.term}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{def.definition}</p>
                  {def.reference && (
                    <p className="text-xs text-gray-400 mt-1">Ref: {def.reference}</p>
                  )}
                </div>
                <ConfidencePill score={def.confidence_score} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionRow({
  section, allSections, expanded, onToggle, depth,
}: {
  section: DocumentSection
  allSections: DocumentSection[]
  expanded: Set<string>
  onToggle: (id: string) => void
  depth: number
}) {
  const children = allSections.filter(s => s.parent_id === section.id)
  const hasChildren = children.length > 0
  const isExpanded = expanded.has(section.id)

  return (
    <div>
      <div
        className={`flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer ${depth > 0 ? 'ml-' + (depth * 4) : ''}`}
        style={{ marginLeft: depth * 16 }}
        onClick={() => hasChildren && onToggle(section.id)}
      >
        <div className="flex-shrink-0 mt-0.5 w-4">
          {hasChildren
            ? isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />
            : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {section.section_number && (
              <span className="text-xs font-mono text-[#007ea7] flex-shrink-0">{section.section_number}</span>
            )}
            <span className={`text-sm font-medium text-[#00171f] ${depth === 0 ? '' : 'font-normal'}`}>{section.title}</span>
            <ConfidencePill score={section.confidence_score} />
          </div>
          {section.content && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{section.content}</p>
          )}
        </div>
      </div>
      {isExpanded && children.map(child => (
        <SectionRow
          key={child.id}
          section={child}
          allSections={allSections}
          expanded={expanded}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function ConfidencePill({ score }: { score: number | null }) {
  if (score == null) return null
  const pct = Math.round(score * 100)
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
      pct >= 80 ? 'bg-green-50 text-green-600' :
      pct >= 60 ? 'bg-amber-50 text-amber-600' :
      'bg-red-50 text-red-600'
    }`}>{pct}%</span>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-8 text-center text-sm text-gray-400">
      {label}
    </div>
  )
}
