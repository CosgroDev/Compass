// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseLib = require('pdf-parse')
const pdfParse = pdfParseLib.default ?? pdfParseLib

export async function convertToMarkdown(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  if (fileType === 'md') {
    return buffer.toString('utf-8')
  }

  if (fileType === 'docx') {
    const result = await mammoth.convertToMarkdown({ buffer })
    return result.value
  }

  if (fileType === 'pdf') {
    const data = await pdfParse(buffer)
    return pdfTextToMarkdown(data.text)
  }

  throw new Error(`Unsupported file type: ${fileType}`)
}

// Best-effort conversion of raw PDF text to structured markdown.
// PDFs lose structure on extraction, so we apply heuristics to recover headings.
function pdfTextToMarkdown(text: string): string {
  const lines = text
    .split('\n')
    .map(l => l.trimEnd())

  const output: string[] = []
  let prev = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (prev !== '') output.push('')
      prev = ''
      continue
    }

    // Detect numbered headings: "4.1.2 Some Title" at start of line
    const headingMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+([A-Z].{2,80})$/)
    if (headingMatch) {
      const dots = (headingMatch[1].match(/\./g) || []).length
      const hashes = '#'.repeat(Math.min(dots + 1, 6))
      output.push(`${hashes} ${trimmed}`)
      prev = 'heading'
      continue
    }

    // All-caps short lines are likely headings
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 80 && trimmed.length > 3) {
      output.push(`## ${trimmed}`)
      prev = 'heading'
      continue
    }

    output.push(trimmed)
    prev = 'text'
  }

  return output.join('\n')
}
