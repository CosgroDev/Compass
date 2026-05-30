import OpenAI from 'openai'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100

export interface EmbeddingInput {
  id: string
  text: string
  content_type: 'requirement' | 'clause' | 'definition'
}

export interface EmbeddingOutput {
  id: string
  embedding: number[]
  content_type: 'requirement' | 'clause' | 'definition'
}

export async function generateEmbeddings(
  inputs: EmbeddingInput[]
): Promise<EmbeddingOutput[]> {
  if (inputs.length === 0) return []

  const results: EmbeddingOutput[] = []

  // Process in batches to stay within API limits
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE)
    const texts = batch.map(item => item.text.slice(0, 8000))

    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    })

    for (let j = 0; j < batch.length; j++) {
      results.push({
        id: batch[j].id,
        embedding: response.data[j].embedding,
        content_type: batch[j].content_type,
      })
    }
  }

  return results
}

export { EMBEDDING_MODEL }
