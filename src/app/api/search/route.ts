import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { query, include_summary, document_ids } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const hasDocFilter = Array.isArray(document_ids) && document_ids.length > 0

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // --- Keyword search ---
  let keywordQuery = admin
    .from('requirement_masters')
    .select(`
      id, requirement_text, requirement_type, clause_id, document_id, confidence_score,
      clauses (clause_number, clause_text),
      documents!inner (id, title, status, tenant_id, knowledge_sources (name), knowledge_assets (title, version_label))
    `)
    .eq('documents.tenant_id', profile.tenant_id)
    .eq('documents.status', 'published')
    .ilike('requirement_text', `%${query}%`)
    .limit(30)

  if (hasDocFilter) keywordQuery = keywordQuery.in('document_id', document_ids)

  const { data: keywordRaw } = await keywordQuery

  const keywordIds = new Set((keywordRaw ?? []).map((r: any) => r.id))

  // --- Semantic search ---
  let semanticResults: any[] = []
  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query.trim() }),
    })

    if (embRes.ok) {
      const embData = await embRes.json()
      const embedding = embData.data[0].embedding as number[]

      const { data: semRaw } = await admin.rpc('search_requirements_semantic', {
        query_embedding: `[${embedding.join(',')}]`,
        p_tenant_id: profile.tenant_id,
        match_count: 20,
        similarity_threshold: 0.25,
      })

      if (semRaw?.length) {
        // Fetch full context for semantic results not already in keyword set
        const newIds = (semRaw as any[])
          .filter(r => !keywordIds.has(r.id) && (!hasDocFilter || document_ids.includes(r.document_id)))
          .map(r => r.id)
        if (newIds.length > 0) {
          const { data: semContext } = await admin
            .from('requirement_masters')
            .select(`
              id, requirement_text, requirement_type, clause_id, document_id, confidence_score,
              clauses (clause_number, clause_text),
              documents (id, title, status, knowledge_sources (name), knowledge_assets (title, version_label))
            `)
            .in('id', newIds)

          const similarityMap = new Map((semRaw as any[]).map(r => [r.id, r.similarity]))
          semanticResults = (semContext ?? []).map((r: any) => ({
            ...r,
            similarity: similarityMap.get(r.id) ?? 0,
          }))
        }
      }
    }
  } catch {
    // Semantic search is best-effort; keyword results still returned
  }

  // --- Merge results ---
  // Keyword matches first (they have verbatim relevance), then semantic-only sorted by similarity
  const keywordResults = (keywordRaw ?? []).map((r: any) => ({
    ...r,
    match_type: semanticResults.find(s => s.id === r.id) ? 'both' : 'keyword',
    similarity: 1.0,
  }))

  const semanticOnly = semanticResults
    .filter(r => !keywordIds.has(r.id))
    .sort((a, b) => b.similarity - a.similarity)
    .map(r => ({ ...r, match_type: 'semantic' }))

  const merged = [...keywordResults, ...semanticOnly].slice(0, 30)

  // Normalise shape
  const results = merged.map((r: any) => ({
    id: r.id,
    requirement_text: r.requirement_text,
    requirement_type: r.requirement_type ?? null,
    confidence_score: r.confidence_score ?? null,
    match_type: r.match_type,
    similarity: r.similarity,
    clause_number: r.clauses?.clause_number ?? null,
    clause_text: r.clauses?.clause_text ?? null,
    document_id: r.documents?.id ?? r.document_id,
    document_title: r.documents?.title ?? null,
    source_name: r.documents?.knowledge_sources?.name ?? null,
    version_label: r.documents?.knowledge_assets?.version_label ?? null,
  }))

  // --- Optional AI summary ---
  let ai_summary: { text: string; citations: string[] } | null = null

  if (include_summary && results.length > 0) {
    const top = results.slice(0, 10)
    const context = top
      .map((r, i) => `[${i + 1}] ${r.clause_number ? `Clause ${r.clause_number}: ` : ''}${r.requirement_text}`)
      .join('\n\n')

    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: `You are a compliance assistant. Answer only from the provided requirements — never use general knowledge.
If the requirements do not address the question, say "The approved knowledge base does not contain requirements covering this topic."
Be concise. Cite requirements using their number in square brackets e.g. [1], [2].`,
        messages: [{
          role: 'user',
          content: `Question: ${query}\n\nApproved requirements:\n${context}\n\nProvide a brief, cited summary answering the question using only the above requirements.`,
        }],
      })

      const summaryText = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const citations = top
        .map((r, i) => ({ idx: i + 1, clause: r.clause_number }))
        .filter(c => c.clause && summaryText.includes(`[${c.idx}]`))
        .map(c => c.clause!)

      ai_summary = { text: summaryText, citations }
    } catch {
      // AI summary is best-effort
    }
  }

  return NextResponse.json({
    results,
    total: results.length,
    query,
    ai_summary,
  })
}
