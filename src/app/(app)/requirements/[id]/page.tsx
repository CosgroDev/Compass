import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { RequirementDetailClient } from './RequirementDetailClient'
import type { RequirementWithContext } from '@/lib/types'

export default async function RequirementDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    .eq('id', id)
    .single()

  if (!raw) notFound()

  const req = raw as unknown as RequirementWithContext

  // Enforce tenant boundary
  if ((req.documents as any)?.tenant_id !== profile.tenant_id) notFound()

  return <RequirementDetailClient requirement={req} />
}
