import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TenantsClient } from './TenantsClient'

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_system_owner, role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_system_owner) redirect('/admin/users')

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('name')

  return <TenantsClient initialTenants={tenants ?? []} />
}
