import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentsClient } from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/dashboard')

  const { data: documents } = await supabase
    .from('documents')
    .select(`
      *,
      knowledge_sources(id, name, owner),
      knowledge_assets(id, title, version_label),
      user_profiles(id, full_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  const canUpload = ['platform_admin', 'tenant_admin', 'compliance_manager', 'contributor'].includes(profile.role)

  return (
    <DocumentsClient
      initialDocuments={documents ?? []}
      canUpload={canUpload}
    />
  )
}
