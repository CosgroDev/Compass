import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersClient } from './UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, is_system_owner')
    .eq('id', user.id)
    .single()

  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('created_at', { ascending: false })

  const canManage = ['platform_admin', 'tenant_admin'].includes(profile?.role ?? '')
  const isSystemOwner = profile?.is_system_owner ?? false

  return (
    <UsersClient
      initialUsers={users ?? []}
      currentUserId={user.id}
      tenantId={profile?.tenant_id ?? ''}
      canManage={canManage}
      isSystemOwner={isSystemOwner}
    />
  )
}
