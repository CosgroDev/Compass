import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequirementsClient } from './RequirementsClient'
import type { RequirementWithContext } from '@/lib/types'

export default async function RequirementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/dashboard')

  // Fetch all requirements from published documents for this tenant
  const { data: raw } = await supabase
    .from('requirement_masters')
    .select(`
      id, document_id, clause_id, requirement_text, requirement_type, confidence_score, created_at,
      clauses (id, clause_number, clause_text),
      documents (
        id, title, status, tenant_id,
        knowledge_sources (id, name),
        knowledge_assets (id, title, version_label)
      )
    `)
    .order('created_at', { ascending: true })

  // Filter to this tenant's published documents only (defence-in-depth — RLS handles the tenant boundary at DB level)
  const requirements: RequirementWithContext[] = ((raw ?? []) as unknown as RequirementWithContext[]).filter(
    r => (r.documents as any)?.tenant_id === profile.tenant_id && (r.documents as any)?.status === 'published'
  )

  return <RequirementsClient requirements={requirements} />
}
