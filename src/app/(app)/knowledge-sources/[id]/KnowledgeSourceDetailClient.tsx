'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle, Plus, X } from 'lucide-react'
import Link from 'next/link'
import type { KnowledgeSource, KnowledgeAsset, TenantKnowledgeAccess } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  source: KnowledgeSource & { knowledge_assets: KnowledgeAsset[] }
  accessRecord: TenantKnowledgeAccess | null
  tenantId: string
  canManage: boolean
}

export function KnowledgeSourceDetailClient({ source, accessRecord, tenantId, canManage }: Props) {
  const router = useRouter()
  const [assets, setAssets] = useState<KnowledgeAsset[]>(
    [...source.knowledge_assets].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  )
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [assetTitle, setAssetTitle] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')

  const supabase = createClient()

  const activeAsset = assets.find(a => a.is_active)
  const latestAsset = assets[0]
  const hasNewer = activeAsset && latestAsset && activeAsset.id !== latestAsset.id

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault()
    if (!assetTitle.trim() || !versionLabel.trim()) return
    setLoading(true); setError('')

    const { data, error: err } = await supabase
      .from('knowledge_assets')
      .insert({
        knowledge_source_id: source.id,
        title: assetTitle.trim(),
        version_label: versionLabel.trim(),
        issue_date: issueDate || null,
        effective_date: effectiveDate || null,
        status: 'draft',
        is_active: false,
      })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    setAssets(prev => [data, ...prev])
    setShowAssetForm(false)
    setAssetTitle(''); setVersionLabel(''); setIssueDate(''); setEffectiveDate('')
    setLoading(false)
  }

  async function handleSetActive(asset: KnowledgeAsset) {
    setLoading(true)
    // Deactivate all first (the unique index handles enforcement, but we need to update)
    await supabase
      .from('knowledge_assets')
      .update({ is_active: false })
      .eq('knowledge_source_id', source.id)

    const { data, error: err } = await supabase
      .from('knowledge_assets')
      .update({ is_active: true, status: 'approved' })
      .eq('id', asset.id)
      .select()
      .single()

    if (!err && data) {
      setAssets(prev => prev.map(a => ({ ...a, is_active: a.id === asset.id, status: a.id === asset.id ? 'approved' : a.status === 'approved' ? 'superseded' : a.status })))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/knowledge-sources" className="flex items-center gap-1 text-[#007ea7] hover:text-[#003459]">
          <ArrowLeft className="h-4 w-4" />
          Knowledge Sources
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{source.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-[#00171f]">{source.name}</h1>
            <Badge status={source.status} />
            {source.requires_license && (
              <span className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-0.5">Licensed</span>
            )}
          </div>
          {source.description && <p className="text-gray-500 text-sm">{source.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {source.owner && <span>Owner: <span className="font-medium text-[#00171f]">{source.owner}</span></span>}
            <span>Type: <span className="font-medium text-[#00171f]">{source.source_type}</span></span>
          </div>
        </div>
      </div>

      {/* Newer version banner */}
      {hasNewer && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            A newer version (<strong>{latestAsset.version_label}</strong>) is available. The active version is <strong>{activeAsset?.version_label}</strong>.
          </p>
        </div>
      )}

      {/* Active version summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Active Version</p>
            <p className="text-lg font-bold text-[#003459]">{activeAsset?.version_label ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Total Assets</p>
            <p className="text-lg font-bold text-[#003459]">{assets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-gray-500 mb-1">Access Status</p>
            {accessRecord
              ? <Badge status={accessRecord.access_status} />
              : <span className="text-sm text-gray-400">Not configured</span>}
          </CardContent>
        </Card>
      </div>

      {/* Assets section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#00171f]">Knowledge Assets</h2>
          {canManage && (
            <Button size="sm" onClick={() => setShowAssetForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add asset
            </Button>
          )}
        </div>

        {/* Add asset modal */}
        {showAssetForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-[#00171f]">Add knowledge asset</h2>
                <button onClick={() => setShowAssetForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAddAsset} className="px-6 py-5 space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Title <span className="text-red-500">*</span></label>
                  <input required value={assetTitle} onChange={e => setAssetTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                    placeholder="e.g. BRCGS Food Safety Issue 9" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version Label <span className="text-red-500">*</span></label>
                  <input required value={versionLabel} onChange={e => setVersionLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                    placeholder="e.g. Issue 9" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                    <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]" />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="secondary" type="button" onClick={() => setShowAssetForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add asset'}</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Issue Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Active</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {!assets.length ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="text-center py-10 text-gray-400">
                    <p>No assets yet. Add the first version.</p>
                  </td>
                </tr>
              ) : assets.map(asset => (
                <tr key={asset.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${asset.is_active ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/knowledge-assets/${asset.id}`} className="font-medium text-[#00171f] hover:text-[#007ea7]">
                      {asset.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#003459]">{asset.version_label}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {asset.issue_date
                      ? new Date(asset.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3"><Badge status={asset.status} /></td>
                  <td className="px-4 py-3">
                    {asset.is_active && (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle className="h-4 w-4" /> Active
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {!asset.is_active && (
                        <button
                          onClick={() => handleSetActive(asset)}
                          disabled={loading}
                          className="text-xs text-[#007ea7] hover:text-[#003459] font-medium transition-colors disabled:opacity-50"
                        >
                          Set active
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
