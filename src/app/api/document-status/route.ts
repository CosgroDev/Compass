import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const documentId = req.nextUrl.searchParams.get('document_id')
  if (!documentId) return NextResponse.json({ error: 'Missing document_id' }, { status: 400 })

  const { data: doc } = await supabase
    .from('documents')
    .select('status')
    .eq('id', documentId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: extractionMeta } = await supabase
    .from('ai_extraction_metadata')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ status: doc.status, extraction_meta: extractionMeta ?? null })
}
