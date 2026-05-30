import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UploadClient } from './UploadClient'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/dashboard')

  const canUpload = ['platform_admin', 'tenant_admin', 'compliance_manager', 'contributor'].includes(profile.role)
  if (!canUpload) redirect('/documents')

  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*, knowledge_assets(id, title, version_label, is_active, knowledge_source_id, issue_date, effective_date, status, created_at)')
    .order('name')

  return (
    <UploadClient
      sources={sources ?? []}
      tenantId={profile.tenant_id}
      userId={user.id}
    />
  )
}
