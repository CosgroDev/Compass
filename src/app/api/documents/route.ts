import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!['platform_admin', 'tenant_admin', 'compliance_manager', 'contributor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 })

  // Fetch the document to verify tenant ownership and get storage path
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, storage_path, tenant_id')
    .eq('id', id)
    .eq('tenant_id', profile?.tenant_id ?? '')
    .single()

  if (fetchError || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Remove file from storage (non-fatal if already gone)
  await admin.storage.from('source-documents').remove([doc.storage_path])

  // Delete the DB record (cascades to processing jobs and events)
  const { error: deleteError } = await admin
    .from('documents')
    .delete()
    .eq('id', id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
