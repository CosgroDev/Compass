import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const PUBLISH_ROLES = ['platform_admin', 'tenant_admin', 'compliance_manager']

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!PUBLISH_ROLES.includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action } = await req.json()
  if (!id || !['publish', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Missing or invalid id/action' }, { status: 400 })
  }

  // Verify document exists, belongs to tenant, and is in review_required state
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, status, tenant_id')
    .eq('id', id)
    .eq('tenant_id', profile?.tenant_id ?? '')
    .single()

  if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (doc.status !== 'review_required') {
    return NextResponse.json({ error: 'Document is not in review_required state' }, { status: 409 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (action === 'publish') {
    const { error } = await admin
      .from('documents')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
    return NextResponse.json({ success: true, status: 'published' })
  }

  // action === 'reject': clear extracted data and reset to uploaded
  // Cascade order respects FK constraints — requirement_embeddings cascade from requirement_masters
  // All extraction tables cascade from documents but we delete explicitly for clarity
  const tables = [
    'requirement_embeddings',
    'requirement_versions',
    'requirement_masters',
    'clauses',
    'document_sections',
    'document_tables',
    'document_definitions',
    'ai_extraction_metadata',
  ]

  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq('document_id', id)
    if (error) {
      return NextResponse.json({ error: `Failed to clear ${table}: ${error.message}` }, { status: 500 })
    }
  }

  const { error: resetErr } = await admin
    .from('documents')
    .update({ status: 'uploaded', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (resetErr) return NextResponse.json({ error: 'Failed to reset document status' }, { status: 500 })
  return NextResponse.json({ success: true, status: 'uploaded' })
}
