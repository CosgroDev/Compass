import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getClient() {
  if (!_client) _client = new Anthropic()
  return _client
}

const PROMPT_VERSION = '1.1'
const MODEL = 'claude-opus-4-8'

// Split markdown into chunks at section boundaries, max ~25k chars each
const MAX_CHUNK_CHARS = 25000

export interface ExtractedMetadata {
  title: string
  version: string | null
  issue_date: string | null
  effective_date: string | null
  document_type: string | null
  source_name: string | null
  confidence_score: number
  extraction_notes: string | null
}

export interface ExtractedSection {
  section_number: string | null
  title: string
  content: string | null
  level: number
  order_index: number
  confidence_score: number
  subsections?: ExtractedSection[]
}

export interface ExtractedClause {
  section_number: string | null
  clause_number: string | null
  clause_text: string
  order_index: number
  confidence_score: number
}

export interface ExtractedRequirement {
  clause_number: string | null
  requirement_text: string
  requirement_type: 'requirement' | 'record' | 'monitoring' | 'verification' | 'validation' | 'training' | 'definition' | null
  confidence_score: number
}

export interface ExtractedTable {
  caption: string | null
  section_number: string | null
  markdown_content: string
  structured_json: {
    headers: string[]
    rows: string[][]
  }
  confidence_score: number
}

export interface ExtractedDefinition {
  term: string
  definition: string
  reference: string | null
  confidence_score: number
}

export interface ExtractionResult {
  metadata: ExtractedMetadata
  sections: ExtractedSection[]
  clauses: ExtractedClause[]
  requirements: ExtractedRequirement[]
  tables: ExtractedTable[]
  definitions: ExtractedDefinition[]
  model_name: string
  prompt_version: string
}

export async function extractWithClaude(markdown: string): Promise<ExtractionResult> {
  // Run all extractions — chunked where needed
  const [metadata, sections, { clauses, requirements }, { tables, definitions }] = await Promise.all([
    extractMetadata(markdown.slice(0, 8000)),
    extractSections(markdown.slice(0, 40000)),
    extractClausesAndRequirementsChunked(markdown),
    extractTablesAndDefinitions(markdown),
  ])

  return {
    metadata,
    sections,
    clauses,
    requirements,
    tables,
    definitions,
    model_name: MODEL,
    prompt_version: PROMPT_VERSION,
  }
}

// --- Individual extraction calls ---

async function extractMetadata(text: string): Promise<ExtractedMetadata> {
  const response = await callClaude(
    'Extract document metadata only. Return JSON with exactly these fields: title, version, issue_date (YYYY-MM-DD or null), effective_date (YYYY-MM-DD or null), document_type (standard/regulation/guidance/policy or null), source_name (issuing body), confidence_score (0-1), extraction_notes (string or null).',
    `Document start:\n---\n${text}\n---`
  )
  const parsed = parseJson(response)
  return parsed as ExtractedMetadata
}

async function extractSections(text: string): Promise<ExtractedSection[]> {
  const response = await callClaude(
    'Extract the document section hierarchy only. Return a JSON array of sections. Each section: { section_number, title, content (brief summary or null), level (1-6), order_index, confidence_score (0-1), subsections: [] }. Preserve numbering exactly.',
    `Document:\n---\n${text}\n---`
  )
  const parsed = parseJson(response)
  return Array.isArray(parsed) ? parsed : (parsed.sections ?? [])
}

async function extractClausesAndRequirementsChunked(markdown: string): Promise<{ clauses: ExtractedClause[]; requirements: ExtractedRequirement[] }> {
  const chunks = chunkMarkdown(markdown)
  const allClauses: ExtractedClause[] = []
  const allRequirements: ExtractedRequirement[] = []
  let orderOffset = 0

  // Process chunks sequentially to avoid rate limits
  for (const chunk of chunks) {
    const result = await extractClausesAndRequirements(chunk, orderOffset)
    allClauses.push(...result.clauses)
    allRequirements.push(...result.requirements)
    orderOffset += result.clauses.length
  }

  return { clauses: allClauses, requirements: allRequirements }
}

async function extractClausesAndRequirements(text: string, orderOffset: number): Promise<{ clauses: ExtractedClause[]; requirements: ExtractedRequirement[] }> {
  const response = await callClaude(
    `Extract clauses and requirements verbatim from this section of a compliance document.

Return JSON: { "clauses": [...], "requirements": [...] }

Clause fields: { clause_number, section_number, clause_text (verbatim), order_index (starting at ${orderOffset}), confidence_score }
Requirement fields: { clause_number, requirement_text (verbatim — do NOT rephrase), requirement_type (requirement/record/monitoring/verification/validation/training/definition or null), confidence_score }

Rules:
- Extract clause text verbatim. Never rephrase.
- One requirement per SHALL/MUST/SHOULD obligation.
- If a clause has multiple obligations, create multiple requirements.
- requirement_type is advisory only.`,
    `Document section:\n---\n${text}\n---`
  )
  const parsed = parseJson(response)
  return {
    clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
  }
}

async function extractTablesAndDefinitions(markdown: string): Promise<{ tables: ExtractedTable[]; definitions: ExtractedDefinition[] }> {
  // Only send portions likely to contain tables and definitions
  const text = markdown.slice(0, 60000)
  const response = await callClaude(
    `Extract all tables and defined terms from this compliance document.

Return JSON: { "tables": [...], "definitions": [...] }

Table fields: { caption (or null), section_number (or null), markdown_content (full markdown table), structured_json: { headers: string[], rows: string[][] }, confidence_score }
Definition fields: { term, definition, reference (clause number or null), confidence_score }

Rules:
- Do NOT flatten tables into plain text. Preserve all rows and columns.
- Only extract terms that are formally defined in the document.`,
    `Document:\n---\n${text}\n---`
  )
  const parsed = parseJson(response)
  return {
    tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
  }
}

// --- Helpers ---

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const stream = await getClient().messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: `You are a compliance document extraction specialist. Return ONLY valid JSON. No commentary, no markdown fences.\n\n${systemPrompt}`,
    messages: [{ role: 'user', content: userMessage }],
  })
  const message = await stream.finalMessage()
  if (message.stop_reason === 'max_tokens') {
    throw new Error(`Claude hit max_tokens during extraction (${systemPrompt.slice(0, 60)}…). Document may be too large.`)
  }
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

function parseJson(text: string): ReturnType<typeof JSON.parse> {
  // Strip markdown fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1].trim() : text.trim()

  // Find outermost JSON object or array
  const objStart = raw.indexOf('{')
  const arrStart = raw.indexOf('[')
  let jsonStr: string

  if (objStart === -1 && arrStart === -1) throw new Error('No JSON found in response')

  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    const end = raw.lastIndexOf(']')
    jsonStr = raw.slice(arrStart, end + 1)
  } else {
    const end = raw.lastIndexOf('}')
    jsonStr = raw.slice(objStart, end + 1)
  }

  try {
    return JSON.parse(jsonStr)
  } catch {
    throw new Error(`Malformed JSON from Claude. First 200 chars: ${jsonStr.slice(0, 200)}`)
  }
}

function chunkMarkdown(markdown: string): string[] {
  if (markdown.length <= MAX_CHUNK_CHARS) return [markdown]

  const chunks: string[] = []
  const lines = markdown.split('\n')
  let current = ''

  for (const line of lines) {
    // Start a new chunk at a heading boundary if current chunk is large enough
    const isHeading = /^#{1,3}\s/.test(line) || /^\d+(\.\d+)?\s+[A-Z]/.test(line)
    if (isHeading && current.length > MAX_CHUNK_CHARS * 0.6) {
      if (current.trim()) chunks.push(current.trim())
      current = line + '\n'
    } else {
      current += line + '\n'
      // Hard split if chunk is too large and no heading found
      if (current.length > MAX_CHUNK_CHARS) {
        chunks.push(current.trim())
        current = ''
      }
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}
