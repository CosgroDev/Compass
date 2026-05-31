import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SearchClient } from './SearchClient'

export interface ScopeDocument {
  id: string
  title: string
  source_id: string
  source_name: string
  version_label: string | null
}

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/dashboard')

  // Fetch all published documents with source info for the scope panel
  const { data: raw } = await supabase
    .from('documents')
    .select('id, title, knowledge_sources (id, name), knowledge_assets (version_label)')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'published')
    .order('title')

  const scopeDocuments: ScopeDocument[] = (raw ?? [])
    .filter((d: any) => d.knowledge_sources?.name)
    .map((d: any) => ({
      id: d.id,
      title: d.title,
      source_id: d.knowledge_sources.id ?? d.knowledge_sources.name,
      source_name: d.knowledge_sources.name,
      version_label: d.knowledge_assets?.version_label ?? null,
    }))

  return (
    <Suspense>
      <SearchClient scopeDocuments={scopeDocuments} />
    </Suspense>
  )
}
