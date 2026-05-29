import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { KnowledgeSourceDetailClient } from './KnowledgeSourceDetailClient'

export default async function KnowledgeSourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  const { data: source } = await supabase
    .from('knowledge_sources')
    .select(`*, knowledge_assets (*)`)
    .eq('id', id)
    .single()

  if (!source) notFound()

  const { data: access } = await supabase
    .from('tenant_knowledge_access')
    .select('*')
    .eq('tenant_id', profile?.tenant_id ?? '')
    .eq('knowledge_source_id', id)
    .single()

  const canManage = ['platform_admin', 'tenant_admin'].includes(profile?.role ?? '')

  return (
    <KnowledgeSourceDetailClient
      source={source}
      accessRecord={access}
      tenantId={profile?.tenant_id ?? ''}
      canManage={canManage}
    />
  )
}
