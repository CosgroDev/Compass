'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { AlertCircle, CheckCircle, KeyRound, User, Pencil } from 'lucide-react'

interface Props {
  userId: string
  userEmail: string
  fullName: string
  role: string
  isSystemOwner: boolean
}

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  tenant_admin: 'Tenant Admin',
  compliance_manager: 'Compliance Manager',
  contributor: 'Contributor',
  viewer: 'Viewer',
  external_auditor: 'External Auditor',
}

export function ProfileClient({ userId, userEmail, fullName, role, isSystemOwner }: Props) {
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(fullName)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(fullName)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setNameSaving(true); setNameError(''); setNameSuccess('')
    const { error: err } = await supabase
      .from('user_profiles')
      .update({ full_name: nameValue.trim() || null })
      .eq('id', userId)
    if (err) {
      setNameError(err.message)
    } else {
      setDisplayName(nameValue.trim())
      setEditingName(false)
      setNameSuccess('Name updated.')
    }
    setNameSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)

    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (signInError) {
      setError('Current password is incorrect.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Password updated successfully.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-[#00171f] mb-6">My profile</h1>

      {/* Account details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-[#003459]/10 rounded-lg">
            <User className="h-5 w-5 text-[#003459]" />
          </div>
          <h2 className="font-semibold text-[#00171f]">Account details</h2>
        </div>

        {nameError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{nameError}</p>
          </div>
        )}
        {nameSuccess && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">{nameSuccess}</p>
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 items-center">
            <span className="text-sm text-gray-500">Name</span>
            <div className="col-span-2">
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
                    placeholder="Your full name"
                  />
                  <Button type="submit" size="sm" disabled={nameSaving}>{nameSaving ? 'Saving…' : 'Save'}</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingName(false); setNameValue(displayName) }}>Cancel</Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#00171f] font-medium">{displayName || <span className="text-gray-400 italic">Not set</span>}</span>
                  <button onClick={() => { setEditingName(true); setNameSuccess('') }} className="text-gray-400 hover:text-[#007ea7] transition-colors" title="Edit name">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm text-[#00171f] font-medium col-span-2">{userEmail}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Role</span>
            <div className="flex items-center gap-2 col-span-2">
              <span className="text-sm text-[#00171f] font-medium">{ROLE_LABELS[role] ?? role}</span>
              {isSystemOwner && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-[#003459] text-white rounded">
                  System owner
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-[#003459]/10 rounded-lg">
            <KeyRound className="h-5 w-5 text-[#003459]" />
          </div>
          <h2 className="font-semibold text-[#00171f]">Change password</h2>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password <span className="text-red-500">*</span></label>
            <input
              required
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              placeholder="Enter your current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password <span className="text-red-500">*</span></label>
            <input
              required
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password <span className="text-red-500">*</span></label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7]"
              placeholder="Repeat new password"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
