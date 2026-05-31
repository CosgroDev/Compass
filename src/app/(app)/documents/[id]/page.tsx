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

  const isReviewReady = ['review_required', 'completed', 'published'].includes(doc.status)

  // Only fetch extracted content when ready
  const [sections, clauses, requirements, tables, definitions] = isReviewReady
    ? await Promise.all([
        supabase.from('document_sections').select('*').eq('document_id', id).order('order_index'),
        supabase.from('clauses').select('*').eq('document_id', id).order('order_index'),
        supabase.from('requirement_masters').select('*').eq('document_id', id).order('created_at'),
        supabase.from('document_tables').select('*').eq('document_id', id).order('table_number'),
        supabase.from('document_definitions').select('*').eq('document_id', id).order('term'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const canManage = ['platform_admin', 'tenant_admin', 'compliance_manager', 'contributor'].includes(profile.role)
  const canReview = ['platform_admin', 'tenant_admin', 'compliance_manager'].includes(profile.role)

  return (
    <DocumentDetailClient
      doc={doc}
      initialJobs={jobs ?? []}
      canManage={canManage}
      canReview={canReview}
      extractionMeta={extractionMeta ?? null}
      extractedSections={sections.data ?? []}
      extractedClauses={clauses.data ?? []}
      extractedRequirements={requirements.data ?? []}
      extractedTables={tables.data ?? []}
      extractedDefinitions={definitions.data ?? []}
    />
  )
}
