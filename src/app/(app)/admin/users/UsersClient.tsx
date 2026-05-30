'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Users, Plus, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { UserProfile, Role } from '@/lib/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'compliance_manager', label: 'Compliance Manager' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'external_auditor', label: 'External Auditor' },
]

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role

interface Props {
  initialUsers: UserProfile[]
  currentUserId: string
  tenantId: string
  canManage: boolean
}

export function UsersClient({ initialUsers, currentUserId, tenantId, canManage }: Props) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deactivatedOpen, setDeactivatedOpen] = useState(false)

  const supabase = createClient()

  const activeUsers = users.filter(u => u.status === 'active')
  const deactivatedUsers = users.filter(u => u.status !== 'active')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setLoading(true); setError(''); setSuccess('')

    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), fullName: inviteFullName.trim(), role: inviteRole, tenantId }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to create user'); setLoading(false); return }

    setUsers(prev => [json.user, ...prev])
    setSuccess(`${inviteEmail} has been added to the organisation.`)
    setInviteEmail(''); setInviteFullName(''); setInviteRole('viewer')
    setShowInvite(false); setLoading(false)
  }

  async function handleToggleStatus(u: UserProfile) {
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    const { data, error: err } = await supabase
      .from('user_profiles')
      .update({ status: newStatus })
      .eq('id', u.id)
      .select()
      .single()
    if (err) { console.error(err); return }
    if (data) setUsers(prev => prev.map(x => x.id === u.id ? data : x))
  }

  async function handleChangeRole(u: UserProfile, role: Role) {
    const { data, error: err } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', u.id)
      .select()
      .single()
    if (!err && data) setUsers(prev => prev.map(x => x.id === u.id ? data : x))
  }

  const TableHead = () => (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
        <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
        {canManage && <th className="px-4 py-3" />}
      </tr>
    </thead>
  )

  const UserRow = ({ u }: { u: UserProfile }) => (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${u.id === currentUserId ? 'bg-blue-50/20' : ''}`}>
      <td className="px-4 py-3">
        <p className="font-medium text-[#00171f]">
          {u.full_name ?? <span className="text-gray-400 italic">No name</span>}
          {u.id === currentUserId && <span className="ml-2 text-xs text-gray-400">(you)</span>}
        </p>
      </td>
      <td className="px-4 py-3">
        {canManage && u.id !== currentUserId ? (
          <select
            value={u.role}
            onChange={e => handleChangeRole(u, e.target.value as Role)}
            className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007ea7]"
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        ) : (
          <span className="text-gray-600">{roleLabel(u.role)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">
        {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      {canManage && (
        <td className="px-4 py-3 text-right">
          {u.id !== currentUserId && (
            <button
              onClick={() => handleToggleStatus(u)}
              className={`text-xs font-medium transition-colors ${
                u.status === 'active'
                  ? 'text-gray-400 hover:text-red-600'
                  : 'text-gray-400 hover:text-green-600'
              }`}
            >
              {u.status === 'active' ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
        </td>
      )}
    </tr>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}
          {deactivatedUsers.length > 0 && ` · ${deactivatedUsers.length} deactivated`}
        </p>
        {canManage && (
          <Button onClick={() => { setShowInvite(true); setError(''); setSuccess('') }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add user
          </Button>
        )}
      </div>

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Add user modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-[#00171f]">Add user</h2>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address <span className="text-red-500">*</span></label>
                <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="user@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input value={inviteFullName} onChange={e => setInviteFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                  placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                A temporary password <strong>Compass2025!</strong> will be set. The user should change it on first login.
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create user'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active users */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <TableHead />
          <tbody>
            {!activeUsers.length ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="text-center py-12 text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No active users.</p>
                </td>
              </tr>
            ) : activeUsers.map(u => <UserRow key={u.id} u={u} />)}
          </tbody>
        </table>
      </div>

      {/* Deactivated users — collapsible */}
      {deactivatedUsers.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setDeactivatedOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
          >
            <span className="flex items-center gap-2">
              {deactivatedOpen
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
              Deactivated users ({deactivatedUsers.length})
            </span>
          </button>
          {deactivatedOpen && (
            <div className="bg-white">
              <table className="w-full text-sm">
                <TableHead />
                <tbody>
                  {deactivatedUsers.map(u => <UserRow key={u.id} u={u} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
