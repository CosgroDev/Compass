import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { convertToMarkdown } from '@/lib/processing/convert-to-markdown'
import { extractWithClaude } from '@/lib/processing/extract-with-claude'
import { generateEmbeddings, EmbeddingInput } from '@/lib/processing/generate-embeddings'
import { storeExtraction } from '@/lib/processing/store-extraction'

export const maxDuration = 300

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

  // Fetch the document
  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('id, storage_path, file_type, tenant_id, title, status')
    .eq('id', document_id)
    .eq('tenant_id', profile?.tenant_id ?? '')
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Create a new processing job
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

  const jobId = job.id

  // Mark document as processing
  await admin.from('documents').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', document_id)

  // Clean up any previous extraction data for this document (reprocess scenario)
  await admin.from('document_sections').delete().eq('document_id', document_id)
  await admin.from('clauses').delete().eq('document_id', document_id)
  await admin.from('requirement_masters').delete().eq('document_id', document_id)
  await admin.from('document_tables').delete().eq('document_id', document_id)
  await admin.from('document_definitions').delete().eq('document_id', document_id)
  await admin.from('requirement_embeddings').delete().eq('document_id', document_id)
  await admin.from('ai_extraction_metadata').delete().eq('document_id', document_id)

  const logEvent = async (event_type: string, message: string) => {
    await admin.from('document_processing_events').insert({ job_id: jobId, event_type, message })
  }

  try {
    // Step 1: Download file from storage
    await logEvent('info', 'Downloading file from storage')
    const { data: fileData, error: downloadErr } = await admin.storage
      .from('source-documents')
      .download(doc.storage_path)

    if (downloadErr || !fileData) {
      throw new Error(`Failed to download file: ${downloadErr?.message}`)
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Step 2: Convert to canonical markdown
    await logEvent('info', `Converting ${doc.file_type.toUpperCase()} to canonical markdown`)
    const markdown = await convertToMarkdown(buffer, doc.file_type)

    // Store canonical markdown in storage
    const markdownPath = doc.storage_path.replace(/\.[^.]+$/, '.md')
    await admin.storage
      .from('canonical-markdown')
      .upload(markdownPath, Buffer.from(markdown, 'utf-8'), {
        contentType: 'text/markdown',
        upsert: true,
      })

    await logEvent('info', `Canonical markdown ready (${markdown.length} characters)`)

    // Step 3: Extract with Claude
    await logEvent('info', 'Running AI extraction (metadata, sections, clauses, requirements, tables, definitions)')
    const extraction = await extractWithClaude(markdown)

    await logEvent('info', [
      `Extraction complete:`,
      `${extraction.sections.length} sections,`,
      `${extraction.clauses.length} clauses,`,
      `${extraction.requirements.length} requirements,`,
      `${extraction.tables.length} tables,`,
      `${extraction.definitions.length} definitions`,
    ].join(' '))

    // Step 4: Generate embeddings
    await logEvent('info', 'Generating embeddings')
    const embeddingInputs: EmbeddingInput[] = [
      ...extraction.requirements.map((r, i) => ({
        id: `req_${i}`,
        text: r.requirement_text,
        content_type: 'requirement' as const,
      })),
      ...extraction.clauses.map(c => ({
        id: `clause_${c.clause_number ?? Math.random()}`,
        text: c.clause_text,
        content_type: 'clause' as const,
      })),
      ...extraction.definitions.map((d, i) => ({
        id: `def_${i}`,
        text: `${d.term}: ${d.definition}`,
        content_type: 'definition' as const,
      })),
    ]

    const embeddings = await generateEmbeddings(embeddingInputs)
    await logEvent('info', `Generated ${embeddings.length} embeddings`)

    // Step 5: Store all results
    await logEvent('info', 'Storing extraction results')
    await storeExtraction(admin, document_id, jobId, extraction, embeddings)

    // Step 6: Mark job and document complete
    await admin.from('document_processing_jobs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    await admin.from('documents').update({
      status: 'review_required',
      updated_at: new Date().toISOString(),
    }).eq('id', document_id)

    await logEvent('success', 'Pipeline complete — document ready for review')

    return NextResponse.json({
      success: true,
      job_id: jobId,
      counts: {
        sections: extraction.sections.length,
        clauses: extraction.clauses.length,
        requirements: extraction.requirements.length,
        tables: extraction.tables.length,
        definitions: extraction.definitions.length,
        embeddings: embeddings.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    await logEvent('error', `Pipeline failed: ${message}`)

    await admin.from('document_processing_jobs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: message,
    }).eq('id', jobId)

    await admin.from('documents').update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    }).eq('id', document_id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
