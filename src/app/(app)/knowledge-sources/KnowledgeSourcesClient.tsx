'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Library, Plus, X, ChevronRight, AlertTriangle, Pencil, ChevronDown, Trash2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { KnowledgeSource, KnowledgeAsset, TenantKnowledgeAccess } from '@/lib/types'

const SOURCE_TYPES = ['Standard', 'Customer Requirement', 'Guidance', 'Position Statement', 'Internal']

type SourceWithAssets = KnowledgeSource & { knowledge_assets: KnowledgeAsset[]; documents: { id: string }[] }

interface Props {
  initialSources: SourceWithAssets[]
  accessRecords: TenantKnowledgeAccess[]
  tenantId: string
  canManage: boolean
}

export function KnowledgeSourcesClient({ initialSources, accessRecords, tenantId, canManage }: Props) {
  const [sources, setSources] = useState(initialSources)
  const [showForm, setShowForm] = useState(false)
  const [editSource, setEditSource] = useState<SourceWithAssets | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState('Standard')
  const [description, setDescription] = useState('')
  const [owner, setOwner] = useState('')
  const [requiresLicense, setRequiresLicense] = useState(false)

  const supabase = createClient()

  const activeSources = sources.filter(s => s.status === 'active')
  const archivedSources = sources.filter(s => s.status !== 'active')

  function getActiveAsset(src: SourceWithAssets) {
    return src.knowledge_assets?.find(a => a.is_active)
  }

  function getLatestAsset(src: SourceWithAssets) {
    return [...(src.knowledge_assets ?? [])].sort((a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )[0]
  }

  function hasNewerVersion(src: SourceWithAssets) {
    const active = getActiveAsset(src)
    const latest = getLatestAsset(src)
    return !!(active && latest && active.id !== latest.id)
  }

  function getAccessStatus(sourceId: string) {
    return accessRecords.find(a => a.knowledge_source_id === sourceId)?.access_status ?? null
  }

  function isDeletable(src: SourceWithAssets) {
    return (src.knowledge_assets?.length ?? 0) === 0 && (src.documents?.length ?? 0) === 0
  }

  function openCreate() {
    setEditSource(null)
    setName(''); setSourceType('Standard'); setDescription(''); setOwner(''); setRequiresLicense(false)
    setError(''); setShowForm(true)
  }

  function openEdit(src: SourceWithAssets) {
    setEditSource(src)
    setName(src.name); setSourceType(src.source_type); setDescription(src.description ?? ''); setOwner(src.owner ?? ''); setRequiresLicense(src.requires_license)
    setError(''); setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError('')

    if (editSource) {
      const { data, error: err } = await supabase
        .from('knowledge_sources')
        .update({ name: name.trim(), source_type: sourceType, description: description.trim() || null, owner: owner.trim() || null, requires_license: requiresLicense })
        .eq('id', editSource.id)
        .select('*, knowledge_assets(*), documents(id)')
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      setSources(prev => prev.map(s => s.id === editSource.id ? data : s))
    } else {
      const { data, error: err } = await supabase
        .from('knowledge_sources')
        .insert({ name: name.trim(), source_type: sourceType, description: description.trim() || null, owner: owner.trim() || null, requires_license: requiresLicense })
        .select('*, knowledge_assets(*), documents(id)')
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      setSources(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }

    setLoading(false); setShowForm(false)
  }

  async function handleArchive(src: SourceWithAssets) {
    const newStatus = src.status === 'active' ? 'archived' : 'active'
    const { data, error: err } = await supabase
      .from('knowledge_sources')
      .update({ status: newStatus })
      .eq('id', src.id)
      .select('*, knowledge_assets(*), documents(id)')
      .single()
    if (!err && data) setSources(prev => prev.map(s => s.id === src.id ? data : s))
  }

  async function handleDelete(src: SourceWithAssets) {
    const { error: err } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', src.id)
    if (!err) setSources(prev => prev.filter(s => s.id !== src.id))
    setDeleteConfirmId(null)
  }

  const SourceRow = ({ src }: { src: SourceWithAssets }) => {
    const active = getActiveAsset(src)
    const latest = getLatestAsset(src)
    const newer = hasNewerVersion(src)
    const accessStatus = getAccessStatus(src.id)
    const deletable = isDeletable(src)
    const isArchived = src.status !== 'active'

    return (
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isArchived ? 'opacity-60' : ''}`}>
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
        <td className="px-4 py-3 text-gray-600">{src.owner ?? <span className="text-gray-400">—</span>}</td>
        <td className="px-4 py-3">
          {active ? <span className="font-medium text-[#00171f]">{active.version_label}</span> : <span className="text-gray-400">—</span>}
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
          {accessStatus ? <Badge status={accessStatus} /> : <span className="text-gray-400 text-xs">Not configured</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 justify-end">
            {!isArchived && (
              <Link href={`/knowledge-sources/${src.id}`} className="flex items-center gap-1 text-[#007ea7] hover:text-[#003459] transition-colors text-xs font-medium">
                View <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {canManage && (
              <>
                {!isArchived && (
                  <button onClick={() => openEdit(src)} className="text-gray-400 hover:text-[#007ea7] transition-colors" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleArchive(src)}
                  className="text-xs font-medium text-gray-400 hover:text-amber-600 transition-colors"
                >
                  {isArchived ? 'Restore' : 'Archive'}
                </button>
                {deletable && (
                  deleteConfirmId === src.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-red-600">Sure?</span>
                      <button onClick={() => handleDelete(src)} className="text-xs font-medium text-red-600 hover:text-red-800">Yes, delete</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(src.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const TableHead = () => (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Owner / body</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Active version</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Latest version</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Access</th>
        <th className="px-4 py-3" />
      </tr>
    </thead>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#00171f]">Knowledge Sources</h1>
          <p className="text-gray-500 text-sm mt-1">Manage standards, customer requirements and other external sources.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add source
          </Button>
        )}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-[#00171f]">{editSource ? 'Edit knowledge source' : 'Add knowledge source'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="e.g. BRCGS Food Safety" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source type <span className="text-red-500">*</span></label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]">
                  {SOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner / body</label>
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
                <Button type="submit" disabled={loading}>{loading ? 'Saving…' : editSource ? 'Save changes' : 'Create source'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active sources */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <TableHead />
          <tbody>
            {!activeSources.length ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <Library className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No knowledge sources yet.</p>
                  {canManage && <p className="text-xs mt-1">Add your first source to get started.</p>}
                </td>
              </tr>
            ) : activeSources.map(src => <SourceRow key={src.id} src={src} />)}
          </tbody>
        </table>
      </div>

      {/* Archived sources — collapsible */}
      {archivedSources.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setArchivedOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
          >
            <span className="flex items-center gap-2">
              {archivedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Archived sources ({archivedSources.length})
            </span>
          </button>
          {archivedOpen && (
            <div className="bg-white">
              <table className="w-full text-sm">
                <TableHead />
                <tbody>{archivedSources.map(src => <SourceRow key={src.id} src={src} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
