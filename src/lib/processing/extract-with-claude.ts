import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getClient() {
  if (!_client) _client = new Anthropic()
  return _client
}

const PROMPT_VERSION = '1.0'
const MODEL = 'claude-opus-4-8'

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

const SYSTEM_PROMPT = `You are a compliance document extraction specialist. Your task is to extract structured data from compliance and regulatory documents with high accuracy.

Rules:
- Do NOT rewrite requirement wording. Extract verbatim from the source.
- Preserve numbering exactly as it appears in the document.
- Clauses are immutable source records.
- When a clause contains multiple requirements, create separate requirement entries.
- Tables must be preserved with full structure.
- Confidence scores: 0.0 (low) to 1.0 (high certainty).
- Return ONLY valid JSON, no commentary.`

const USER_PROMPT_TEMPLATE = (markdown: string) => `Extract all structured data from this compliance document.

Return a JSON object with this exact structure:
{
  "metadata": {
    "title": "document title",
    "version": "version or null",
    "issue_date": "YYYY-MM-DD or null",
    "effective_date": "YYYY-MM-DD or null",
    "document_type": "standard/regulation/guidance/policy or null",
    "source_name": "issuing body or null",
    "confidence_score": 0.0-1.0,
    "extraction_notes": "any notes about extraction quality or null"
  },
  "sections": [
    {
      "section_number": "4.1 or null",
      "title": "Section Title",
      "content": "full section text or null",
      "level": 1,
      "order_index": 0,
      "confidence_score": 0.0-1.0,
      "subsections": []
    }
  ],
  "clauses": [
    {
      "section_number": "4.1 or null",
      "clause_number": "4.1.2 or null",
      "clause_text": "verbatim clause text",
      "order_index": 0,
      "confidence_score": 0.0-1.0
    }
  ],
  "requirements": [
    {
      "clause_number": "4.1.2 or null",
      "requirement_text": "verbatim requirement text - do not rephrase",
      "requirement_type": "requirement|record|monitoring|verification|validation|training|definition or null",
      "confidence_score": 0.0-1.0
    }
  ],
  "tables": [
    {
      "caption": "table title or null",
      "section_number": "section reference or null",
      "markdown_content": "| col1 | col2 |\\n|------|------|\\n| val1 | val2 |",
      "structured_json": {
        "headers": ["col1", "col2"],
        "rows": [["val1", "val2"]]
      },
      "confidence_score": 0.0-1.0
    }
  ],
  "definitions": [
    {
      "term": "Defined Term",
      "definition": "The definition text",
      "reference": "clause reference or null",
      "confidence_score": 0.0-1.0
    }
  ]
}

Document:
---
${markdown.slice(0, 80000)}
---`

export async function extractWithClaude(markdown: string): Promise<ExtractionResult> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: USER_PROMPT_TEMPLATE(markdown),
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const jsonText = extractJson(content.text)
  let parsed: ReturnType<typeof JSON.parse>
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    const truncated = jsonText.slice(0, 200)
    throw new Error(`Claude returned malformed JSON (stop_reason: ${message.stop_reason}). First 200 chars: ${truncated}`)
  }

  return {
    ...parsed,
    model_name: MODEL,
    prompt_version: PROMPT_VERSION,
  }
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Find first { to last }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return text.slice(start, end + 1)
}
