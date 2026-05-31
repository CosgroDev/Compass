import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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

  const { document_id } = await req.json()
  if (!document_id) return NextResponse.json({ error: 'Missing document_id' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify document belongs to this tenant
  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('id, tenant_id')
    .eq('id', document_id)
    .eq('tenant_id', profile?.tenant_id ?? '')
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Create the processing job
  const { data: job, error: jobErr } = await admin
    .from('document_processing_jobs')
    .insert({
      document_id,
      job_type: 'full_pipeline',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: 'Failed to create processing job' }, { status: 500 })
  }

  // Mark document as processing
  await admin.from('documents').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', document_id)

  // Fire edge function — runs independently, no timeout constraint
  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-document`
  fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pipeline-secret': process.env.PIPELINE_SECRET ?? 'compass-pipeline',
    },
    body: JSON.stringify({ document_id, job_id: job.id }),
  }).catch(() => {})

  return NextResponse.json({ triggered: true, job_id: job.id })
}
