import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { DocumentDetailClient } from './DocumentDetailClient'

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/dashboard')

  const { data: doc } = await supabase
    .from('documents')
    .select(`
      *,
      knowledge_sources(id, name),
      knowledge_assets(id, title, version_label),
      user_profiles(id, full_name)
    `)
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!doc) notFound()

  const { data: jobs } = await supabase
    .from('document_processing_jobs')
    .select(`*, document_processing_events(*)`)
    .eq('document_id', id)
    .order('created_at', { ascending: false })

  const { data: extractionMeta } = await supabase
    .from('ai_extraction_metadata')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const canManage = ['platform_admin', 'tenant_admin', 'compliance_manager', 'contributor'].includes(profile.role)

  return (
    <DocumentDetailClient
      doc={doc}
      initialJobs={jobs ?? []}
      canManage={canManage}
      extractionMeta={extractionMeta ?? null}
    />
  )
}
