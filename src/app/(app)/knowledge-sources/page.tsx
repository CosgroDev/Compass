import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KnowledgeSourcesClient } from './KnowledgeSourcesClient'

export default async function KnowledgeSourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select(`
      *,
      knowledge_assets (id, version_label, status, is_active, issue_date, effective_date, created_at),
      documents (id)
    `)
    .order('name')

  const { data: accessRecords } = await supabase
    .from('tenant_knowledge_access')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')

  const canManage = ['platform_admin', 'tenant_admin'].includes(profile?.role ?? '')

  return (
    <KnowledgeSourcesClient
      initialSources={sources ?? []}
      accessRecords={accessRecords ?? []}
      tenantId={profile?.tenant_id ?? ''}
      canManage={canManage}
    />
  )
}
