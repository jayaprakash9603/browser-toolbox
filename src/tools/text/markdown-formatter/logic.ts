export function formatMarkdown(input: string): string {
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let inCodeBlock = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '')

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      out.push(line.trim())
      continue
    }
    if (inCodeBlock) {
      out.push(line)
      continue
    }

    let formatted = line
    const headingMatch = formatted.match(/^\s*(#{1,6})\s*(.*)$/)
    if (headingMatch && headingMatch[2]) {
      formatted = `${headingMatch[1]} ${headingMatch[2].trim()}`
    }

    const listMatch = formatted.match(/^\s*[-*+]\s+(.*)$/)
    if (listMatch) {
      formatted = `- ${listMatch[1].trim()}`
    }

    const orderedMatch = formatted.match(/^\s*(\d+)[.)]\s+(.*)$/)
    if (orderedMatch) {
      formatted = `${orderedMatch[1]}. ${orderedMatch[2].trim()}`
    }

    out.push(formatted)
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(#{1,6} .+)$/gm, '\n$1')
    .replace(/^\n+/, '')
    .trimEnd()
}
