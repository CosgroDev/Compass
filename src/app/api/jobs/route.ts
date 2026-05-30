import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const documentId = req.nextUrl.searchParams.get('document_id')
  if (!documentId) return NextResponse.json({ error: 'Missing document_id' }, { status: 400 })

  const { data: jobs } = await supabase
    .from('document_processing_jobs')
    .select('*, document_processing_events(*)')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ jobs: jobs ?? [] })
}
