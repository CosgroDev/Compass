import { SupabaseClient } from '@supabase/supabase-js'
import { ExtractionResult, ExtractedSection } from './extract-with-claude'
import { EmbeddingOutput, EMBEDDING_MODEL } from './generate-embeddings'

export async function storeExtraction(
  supabase: SupabaseClient,
  documentId: string,
  jobId: string,
  result: ExtractionResult,
  embeddings: EmbeddingOutput[]
): Promise<void> {
  // Store sections (flattened with parent_id linkage)
  const sectionIdMap = new Map<string, string>()
  await storeSections(supabase, documentId, result.sections, null, 0, sectionIdMap)

  // Store clauses
  const clauseIdMap = new Map<string | null, string>()
  if (result.clauses.length > 0) {
    const clauseRows = result.clauses.map(c => ({
      document_id: documentId,
      section_id: c.section_number ? sectionIdMap.get(c.section_number) ?? null : null,
      clause_number: c.clause_number,
      clause_text: c.clause_text,
      order_index: c.order_index,
      confidence_score: c.confidence_score,
    }))
    const { data: insertedClauses, error } = await supabase
      .from('clauses')
      .insert(clauseRows)
      .select('id, clause_number')
    if (error) throw new Error(`Failed to insert clauses: ${error.message}`)
    for (const c of insertedClauses ?? []) {
      if (c.clause_number) clauseIdMap.set(c.clause_number, c.id)
    }
  }

  // Store requirements + initial versions
  const requirementIdMap = new Map<number, string>()
  if (result.requirements.length > 0) {
    const reqRows = result.requirements.map(r => ({
      document_id: documentId,
      clause_id: r.clause_number ? clauseIdMap.get(r.clause_number) ?? null : null,
      requirement_text: r.requirement_text,
      requirement_type: r.requirement_type,
      confidence_score: r.confidence_score,
    }))
    const { data: insertedReqs, error } = await supabase
      .from('requirement_masters')
      .insert(reqRows)
      .select('id, requirement_text')
    if (error) throw new Error(`Failed to insert requirements: ${error.message}`)

    // Create initial versions
    if (insertedReqs && insertedReqs.length > 0) {
      const versionRows = insertedReqs.map((r, i) => ({
        requirement_master_id: r.id,
        version_number: 1,
        requirement_text: r.requirement_text,
        change_note: 'Initial extraction',
      }))
      const { error: verErr } = await supabase
        .from('requirement_versions')
        .insert(versionRows)
      if (verErr) throw new Error(`Failed to insert requirement versions: ${verErr.message}`)

      for (let i = 0; i < insertedReqs.length; i++) {
        requirementIdMap.set(i, insertedReqs[i].id)
      }
    }
  }

  // Store tables
  if (result.tables.length > 0) {
    const tableRows = result.tables.map((t, i) => ({
      document_id: documentId,
      section_id: t.section_number ? sectionIdMap.get(t.section_number) ?? null : null,
      table_number: i + 1,
      caption: t.caption,
      markdown_content: t.markdown_content,
      structured_json: t.structured_json,
      confidence_score: t.confidence_score,
    }))
    const { error } = await supabase.from('document_tables').insert(tableRows)
    if (error) throw new Error(`Failed to insert tables: ${error.message}`)
  }

  // Store definitions
  const definitionIdMap = new Map<number, string>()
  if (result.definitions.length > 0) {
    const defRows = result.definitions.map(d => ({
      document_id: documentId,
      term: d.term,
      definition: d.definition,
      reference: d.reference,
      confidence_score: d.confidence_score,
    }))
    const { data: insertedDefs, error } = await supabase
      .from('document_definitions')
      .insert(defRows)
      .select('id')
    if (error) throw new Error(`Failed to insert definitions: ${error.message}`)
    for (let i = 0; i < (insertedDefs?.length ?? 0); i++) {
      definitionIdMap.set(i, insertedDefs![i].id)
    }
  }

  // Store embeddings
  if (embeddings.length > 0) {
    const embeddingRows = embeddings.map(e => {
      const row: Record<string, unknown> = {
        document_id: documentId,
        content_type: e.content_type,
        embedding: `[${e.embedding.join(',')}]`,
        model_name: EMBEDDING_MODEL,
      }
      if (e.content_type === 'requirement') {
        const idx = parseInt(e.id.replace('req_', ''))
        row.requirement_master_id = requirementIdMap.get(idx) ?? null
      } else if (e.content_type === 'clause') {
        const clauseNum = e.id.replace('clause_', '')
        row.clause_id = clauseIdMap.get(clauseNum) ?? null
      } else if (e.content_type === 'definition') {
        const idx = parseInt(e.id.replace('def_', ''))
        row.definition_id = definitionIdMap.get(idx) ?? null
      }
      return row
    })

    const { error } = await supabase.from('requirement_embeddings').insert(embeddingRows)
    if (error) throw new Error(`Failed to insert embeddings: ${error.message}`)
  }

  // Store AI governance metadata
  const overallConfidence = calcOverallConfidence(result)
  const { error: metaErr } = await supabase.from('ai_extraction_metadata').insert({
    document_id: documentId,
    job_id: jobId,
    model_name: result.model_name,
    prompt_version: result.prompt_version,
    extraction_timestamp: new Date().toISOString(),
    sections_count: countSections(result.sections),
    clauses_count: result.clauses.length,
    requirements_count: result.requirements.length,
    tables_count: result.tables.length,
    definitions_count: result.definitions.length,
    overall_confidence: overallConfidence,
    extraction_notes: result.metadata.extraction_notes,
  })
  if (metaErr) throw new Error(`Failed to insert extraction metadata: ${metaErr.message}`)
}

async function storeSections(
  supabase: SupabaseClient,
  documentId: string,
  sections: ExtractedSection[],
  parentId: string | null,
  depth: number,
  idMap: Map<string, string>
): Promise<void> {
  for (const section of sections) {
    const { data, error } = await supabase
      .from('document_sections')
      .insert({
        document_id: documentId,
        parent_id: parentId,
        section_number: section.section_number,
        title: section.title,
        content: section.content,
        level: section.level ?? depth + 1,
        order_index: section.order_index,
        confidence_score: section.confidence_score,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to insert section: ${error.message}`)

    if (section.section_number) idMap.set(section.section_number, data.id)

    if (section.subsections && section.subsections.length > 0) {
      await storeSections(supabase, documentId, section.subsections, data.id, depth + 1, idMap)
    }
  }
}

function countSections(sections: ExtractedSection[]): number {
  return sections.reduce((sum, s) => {
    return sum + 1 + countSections(s.subsections ?? [])
  }, 0)
}

function calcOverallConfidence(result: ExtractionResult): number {
  const scores = [
    result.metadata.confidence_score,
    ...result.clauses.map(c => c.confidence_score),
    ...result.requirements.map(r => r.confidence_score),
    ...result.tables.map(t => t.confidence_score),
    ...result.definitions.map(d => d.confidence_score),
  ].filter(s => typeof s === 'number' && !isNaN(s))

  if (scores.length === 0) return 0
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 1000) / 1000
}
