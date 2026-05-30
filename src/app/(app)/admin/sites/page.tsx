import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { SitesClient } from './SitesClient'

export default async function SitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, is_system_owner')
    .eq('id', user.id)
    .single()

  const canEdit = ['platform_admin', 'tenant_admin', 'compliance_manager'].includes(profile?.role ?? '')
  const isSystemOwner = profile?.is_system_owner ?? false

  if (isSystemOwner) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: tenants } = await admin.from('tenants').select('*').order('name')
    const { data: allSites } = await admin.from('sites').select('*').order('name')

    return (
      <SitesClient
        initialSites={allSites ?? []}
        tenantId={profile?.tenant_id ?? ''}
        canEdit={canEdit}
        isSystemOwner={isSystemOwner}
        allTenants={tenants ?? []}
      />
    )
  }

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('name')

  return (
    <SitesClient
      initialSites={sites ?? []}
      tenantId={profile?.tenant_id ?? ''}
      canEdit={canEdit}
      isSystemOwner={isSystemOwner}
      allTenants={[]}
    />
  )
}
