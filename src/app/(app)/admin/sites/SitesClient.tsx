'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, X, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import type { Site, Tenant } from '@/lib/types'

interface Props {
  initialSites: Site[]
  tenantId: string
  canEdit: boolean
  isSystemOwner: boolean
  allTenants: Tenant[]
}

export function SitesClient({ initialSites, tenantId, canEdit, isSystemOwner, allTenants }: Props) {
  const [sites, setSites] = useState<Site[]>(initialSites)
  const [showForm, setShowForm] = useState(false)
  const [editSite, setEditSite] = useState<Site | null>(null)
  const [name, setName] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [formTenantId, setFormTenantId] = useState(tenantId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [collapsedTenants, setCollapsedTenants] = useState<Set<string>>(new Set())
  const [archivedOpen, setArchivedOpen] = useState(false)

  const supabase = createClient()

  function openCreate() {
    setEditSite(null); setName(''); setSiteCode(''); setFormTenantId(tenantId); setError(''); setShowForm(true)
  }

  function openEdit(site: Site) {
    setEditSite(site); setName(site.name); setSiteCode(site.site_code ?? ''); setFormTenantId(site.tenant_id); setError(''); setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError('')

    if (editSite) {
      const { data, error: err } = await supabase
        .from('sites').update({ name: name.trim(), site_code: siteCode.trim() || null })
        .eq('id', editSite.id).select().single()
      if (err) { setError(err.message); setLoading(false); return }
      setSites(prev => prev.map(s => s.id === editSite.id ? data : s))
    } else {
      const { data, error: err } = await supabase
        .from('sites').insert({ tenant_id: formTenantId, name: name.trim(), site_code: siteCode.trim() || null })
        .select().single()
      if (err) { setError(err.message); setLoading(false); return }
      setSites(prev => [...prev, data])
    }

    setLoading(false); setShowForm(false)
  }

  async function handleArchive(site: Site) {
    const newStatus = site.status === 'active' ? 'archived' : 'active'
    const { data, error: err } = await supabase
      .from('sites').update({ status: newStatus }).eq('id', site.id).select().single()
    if (!err && data) setSites(prev => prev.map(s => s.id === site.id ? data : s))
  }

  function toggleTenant(tid: string) {
    setCollapsedTenants(prev => {
      const next = new Set(prev)
      next.has(tid) ? next.delete(tid) : next.add(tid)
      return next
    })
  }

  const TableHead = () => (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Site code</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
        {canEdit && <th className="px-4 py-3" />}
      </tr>
    </thead>
  )

  const SiteRow = ({ site }: { site: Site }) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-[#00171f]">{site.name}</td>
      <td className="px-4 py-3 text-gray-500">{site.site_code ?? '—'}</td>
      <td className="px-4 py-3 text-gray-500">
        {new Date(site.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      {canEdit && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 justify-end">
            <button onClick={() => openEdit(site)} className="text-gray-400 hover:text-[#007ea7] transition-colors" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleArchive(site)}
              className={`text-xs font-medium transition-colors ${site.status === 'active' ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
            >
              {site.status === 'active' ? 'Archive' : 'Restore'}
            </button>
          </div>
        </td>
      )}
    </tr>
  )

  const FormModal = () => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-[#00171f]">{editSite ? 'Edit site' : 'Add site'}</h2>
          <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          {isSystemOwner && !editSite && allTenants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant <span className="text-red-500">*</span></label>
              <select value={formTenantId} onChange={e => setFormTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]">
                {allTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site name <span className="text-red-500">*</span></label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              placeholder="e.g. Batley" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site code</label>
            <input value={siteCode} onChange={e => setSiteCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              placeholder="e.g. BTL" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : editSite ? 'Save changes' : 'Add site'}</Button>
          </div>
        </form>
      </div>
    </div>
  )

  // ── System owner grouped view ─────────────────────────────────────────────
  if (isSystemOwner && allTenants.length > 0) {
    const sitesByTenant = (tid: string) => sites.filter(s => s.tenant_id === tid)

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {sites.length} site{sites.length !== 1 ? 's' : ''} across {allTenants.length} tenant{allTenants.length !== 1 ? 's' : ''}
          </p>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add site
            </Button>
          )}
        </div>

        {showForm && <FormModal />}

        <div className="space-y-3">
          {allTenants.map(tenant => {
            const tenantSites = sitesByTenant(tenant.id)
            const activeSites = tenantSites.filter(s => s.status === 'active')
            const archivedSites = tenantSites.filter(s => s.status !== 'active')
            const isCollapsed = collapsedTenants.has(tenant.id)

            return (
              <div key={tenant.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleTenant(tenant.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-[#00171f]"
                >
                  <span className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    {tenant.name}
                    <span className="text-xs font-normal text-gray-400 font-mono">{tenant.slug}</span>
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {activeSites.length} active{archivedSites.length > 0 ? ` · ${archivedSites.length} archived` : ''}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="bg-white">
                    <table className="w-full text-sm">
                      <TableHead />
                      <tbody>
                        {!tenantSites.length ? (
                          <tr>
                            <td colSpan={canEdit ? 4 : 3} className="text-center py-6 text-gray-400 text-xs">
                              No sites in this tenant.
                            </td>
                          </tr>
                        ) : tenantSites.map(s => <SiteRow key={s.id} site={s} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Regular tenant admin view ─────────────────────────────────────────────
  const activeSites = sites.filter(s => s.status === 'active')
  const archivedSites = sites.filter(s => s.status !== 'active')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {activeSites.length} active site{activeSites.length !== 1 ? 's' : ''}
          {archivedSites.length > 0 && ` · ${archivedSites.length} archived`}
        </p>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add site
          </Button>
        )}
      </div>

      {showForm && <FormModal />}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <TableHead />
          <tbody>
            {!activeSites.length ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="text-center py-12 text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No active sites. Add your first site.</p>
                </td>
              </tr>
            ) : activeSites.map(site => <SiteRow key={site.id} site={site} />)}
          </tbody>
        </table>
      </div>

      {archivedSites.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setArchivedOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
          >
            <span className="flex items-center gap-2">
              {archivedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Archived sites ({archivedSites.length})
            </span>
          </button>
          {archivedOpen && (
            <div className="bg-white">
              <table className="w-full text-sm">
                <TableHead />
                <tbody>{archivedSites.map(site => <SiteRow key={site.id} site={site} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
