'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, X, Pencil } from 'lucide-react'
import type { Site } from '@/lib/types'

interface Props {
  initialSites: Site[]
  tenantId: string
  canEdit: boolean
}

export function SitesClient({ initialSites, tenantId, canEdit }: Props) {
  const [sites, setSites] = useState<Site[]>(initialSites)
  const [showForm, setShowForm] = useState(false)
  const [editSite, setEditSite] = useState<Site | null>(null)
  const [name, setName] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  function openCreate() {
    setEditSite(null)
    setName('')
    setSiteCode('')
    setError('')
    setShowForm(true)
  }

  function openEdit(site: Site) {
    setEditSite(site)
    setName(site.name)
    setSiteCode(site.site_code ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    if (editSite) {
      const { data, error: err } = await supabase
        .from('sites')
        .update({ name: name.trim(), site_code: siteCode.trim() || null })
        .eq('id', editSite.id)
        .select()
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      setSites(prev => prev.map(s => s.id === editSite.id ? data : s))
    } else {
      const { data, error: err } = await supabase
        .from('sites')
        .insert({ tenant_id: tenantId, name: name.trim(), site_code: siteCode.trim() || null })
        .select()
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      setSites(prev => [...prev, data])
    }

    setLoading(false)
    setShowForm(false)
  }

  async function handleArchive(site: Site) {
    const newStatus = site.status === 'active' ? 'archived' : 'active'
    const { data, error: err } = await supabase
      .from('sites')
      .update({ status: newStatus })
      .eq('id', site.id)
      .select()
      .single()
    if (!err && data) setSites(prev => prev.map(s => s.id === site.id ? data : s))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#00171f]">Sites</h1>
          <p className="text-gray-500 text-sm mt-1">Manage manufacturing and operational sites.</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Site
          </Button>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-[#00171f]">{editSite ? 'Edit Site' : 'Add Site'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name <span className="text-red-500">*</span></label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="e.g. Batley"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Code</label>
                <input
                  value={siteCode}
                  onChange={e => setSiteCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="e.g. BTL"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving…' : editSite ? 'Save Changes' : 'Add Site'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Site Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {!sites.length ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="text-center py-12 text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No sites yet. Add your first site.</p>
                </td>
              </tr>
            ) : sites.map(site => (
              <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-[#00171f]">{site.name}</td>
                <td className="px-4 py-3 text-gray-500">{site.site_code ?? '—'}</td>
                <td className="px-4 py-3"><Badge status={site.status} /></td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(site.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(site)} className="text-gray-400 hover:text-[#007ea7]" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(site)}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                        title={site.status === 'active' ? 'Archive' : 'Restore'}
                      >
                        {site.status === 'active' ? 'Archive' : 'Restore'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
