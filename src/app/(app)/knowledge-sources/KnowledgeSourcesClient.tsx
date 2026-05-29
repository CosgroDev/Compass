'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Library, Plus, X, ChevronRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { KnowledgeSource, KnowledgeAsset, TenantKnowledgeAccess } from '@/lib/types'

const SOURCE_TYPES = ['Standard', 'Customer Requirement', 'Guidance', 'Position Statement', 'Internal']

interface Props {
  initialSources: (KnowledgeSource & { knowledge_assets: KnowledgeAsset[] })[]
  accessRecords: TenantKnowledgeAccess[]
  tenantId: string
  canManage: boolean
}

export function KnowledgeSourcesClient({ initialSources, accessRecords, tenantId, canManage }: Props) {
  const [sources, setSources] = useState(initialSources)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState('Standard')
  const [description, setDescription] = useState('')
  const [owner, setOwner] = useState('')
  const [requiresLicense, setRequiresLicense] = useState(false)

  const supabase = createClient()

  function getActiveAsset(src: KnowledgeSource & { knowledge_assets: KnowledgeAsset[] }) {
    return src.knowledge_assets?.find(a => a.is_active)
  }

  function getLatestAsset(src: KnowledgeSource & { knowledge_assets: KnowledgeAsset[] }) {
    return src.knowledge_assets?.sort((a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )[0]
  }

  function hasNewerVersion(src: KnowledgeSource & { knowledge_assets: KnowledgeAsset[] }) {
    const active = getActiveAsset(src)
    const latest = getLatestAsset(src)
    if (!active || !latest) return false
    return active.id !== latest.id
  }

  function getAccessStatus(sourceId: string) {
    const rec = accessRecords.find(a => a.knowledge_source_id === sourceId)
    return rec?.access_status ?? null
  }

  function openCreate() {
    setName(''); setSourceType('Standard'); setDescription(''); setOwner(''); setRequiresLicense(false)
    setError(''); setShowForm(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError('')

    const { data, error: err } = await supabase
      .from('knowledge_sources')
      .insert({ name: name.trim(), source_type: sourceType, description: description.trim() || null, owner: owner.trim() || null, requires_license: requiresLicense })
      .select('*, knowledge_assets(*)')
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    setSources(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setLoading(false); setShowForm(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#00171f]">Knowledge Sources</h1>
          <p className="text-gray-500 text-sm mt-1">Manage standards, customer requirements and other external sources.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Source
          </Button>
        )}
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-[#00171f]">Add Knowledge Source</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="e.g. BRCGS Food Safety" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type <span className="text-red-500">*</span></label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]">
                  {SOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner / Body</label>
                <input value={owner} onChange={e => setOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="e.g. BRCGS" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="license" checked={requiresLicense} onChange={e => setRequiresLicense(e.target.checked)}
                  className="rounded border-gray-300 text-[#003459]" />
                <label htmlFor="license" className="text-sm text-gray-700">Requires licence / proof of entitlement</label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Source'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Active Version</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Latest Version</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Access</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!sources.length ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <Library className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No knowledge sources yet.</p>
                  {canManage && <p className="text-xs mt-1">Add your first source to get started.</p>}
                </td>
              </tr>
            ) : sources.map(src => {
              const active = getActiveAsset(src)
              const latest = getLatestAsset(src)
              const newer = hasNewerVersion(src)
              const accessStatus = getAccessStatus(src.id)

              return (
                <tr key={src.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#00171f]">{src.name}</span>
                      {src.requires_license && (
                        <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Licensed</span>
                      )}
                    </div>
                    {src.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{src.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{src.source_type}</td>
                  <td className="px-4 py-3">
                    {active
                      ? <span className="font-medium text-[#00171f]">{active.version_label}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {latest
                        ? <span className={newer ? 'font-medium text-amber-600' : 'text-gray-600'}>{latest.version_label}</span>
                        : <span className="text-gray-400">—</span>}
                      {newer && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Newer available
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {accessStatus
                      ? <Badge status={accessStatus} />
                      : <span className="text-gray-400 text-xs">Not configured</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/knowledge-sources/${src.id}`} className="flex items-center gap-1 text-[#007ea7] hover:text-[#003459] transition-colors text-xs font-medium">
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
