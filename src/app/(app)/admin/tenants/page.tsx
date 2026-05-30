import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: tenants } = await admin
    .from('tenants')
    .select('*')
    .order('name')

  return <TenantsClient initialTenants={tenants ?? []} />
}
