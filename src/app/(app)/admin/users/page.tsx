import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

  const canManage = ['platform_admin', 'tenant_admin'].includes(profile?.role ?? '')
  const isSystemOwner = profile?.is_system_owner ?? false

  if (isSystemOwner) {
    // System owner sees all tenants and all users via admin client
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: tenants } = await admin.from('tenants').select('*').order('name')
    const { data: allUsers } = await admin.from('user_profiles').select('*').order('full_name')

    return (
      <UsersClient
        initialUsers={allUsers ?? []}
        currentUserId={user.id}
        tenantId={profile?.tenant_id ?? ''}
        canManage={canManage}
        isSystemOwner={isSystemOwner}
        allTenants={tenants ?? []}
      />
    )
  }

  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('full_name')

  return (
    <UsersClient
      initialUsers={users ?? []}
      currentUserId={user.id}
      tenantId={profile?.tenant_id ?? ''}
      canManage={canManage}
      isSystemOwner={isSystemOwner}
      allTenants={[]}
    />
  )
}
