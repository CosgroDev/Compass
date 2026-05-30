'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, X, Pencil } from 'lucide-react'
import type { Tenant } from '@/lib/types'

interface Props {
  initialTenants: Tenant[]
}

export function TenantsClient({ initialTenants }: Props) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [showForm, setShowForm] = useState(false)
  const [editTenant, setEditTenant] = useState<Tenant | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditTenant(null); setName(''); setSlug(''); setError(''); setShowForm(true)
  }

  function openEdit(t: Tenant) {
    setEditTenant(t); setName(t.name); setSlug(t.slug); setError(''); setShowForm(true)
  }

  function slugify(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setLoading(true); setError('')

    const res = await fetch('/api/admin/tenants', {
      method: editTenant ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTenant
        ? { id: editTenant.id, name, slug }
        : { name, slug }
      ),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to save tenant'); setLoading(false); return }

    if (editTenant) {
      setTenants(prev => prev.map(t => t.id === editTenant.id ? json.tenant : t))
    } else {
      setTenants(prev => [...prev, json.tenant].sort((a, b) => a.name.localeCompare(b.name)))
    }

    setLoading(false); setShowForm(false)
  }

  async function handleToggleStatus(t: Tenant) {
    const newStatus = t.status === 'active' ? 'inactive' : 'active'
    const res = await fetch('/api/admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, status: newStatus }),
    })
    const json = await res.json()
    if (res.ok) setTenants(prev => prev.map(x => x.id === t.id ? json.tenant : x))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add tenant
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-[#00171f]">{editTenant ? 'Edit tenant' : 'Add tenant'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name <span className="text-red-500">*</span></label>
                <input
                  required value={name}
                  onChange={e => { setName(e.target.value); if (!editTenant) setSlug(slugify(e.target.value)) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="e.g. Acme Foods Ltd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
                <input
                  required value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7] font-mono"
                  placeholder="acme-foods-ltd"
                />
                <p className="text-xs text-gray-400 mt-1">Unique identifier — lowercase letters, numbers and hyphens only.</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving…' : editTenant ? 'Save changes' : 'Create tenant'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Organisation</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!tenants.length ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No tenants yet.</p>
                </td>
              </tr>
            ) : tenants.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-[#00171f]">{t.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.slug}</td>
                <td className="px-4 py-3"><Badge status={t.status} /></td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-[#007ea7] transition-colors" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className={`text-xs font-medium transition-colors ${t.status === 'active' ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                    >
                      {t.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
