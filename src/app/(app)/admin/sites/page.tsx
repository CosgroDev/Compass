import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { SitesClient } from './SitesClient'

export default async function SitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .order('name')

  const canEdit = ['platform_admin', 'tenant_admin', 'compliance_manager'].includes(profile?.role ?? '')

  return (
    <SitesClient
      initialSites={sites ?? []}
      tenantId={profile?.tenant_id ?? ''}
      canEdit={canEdit}
    />
  )
}
