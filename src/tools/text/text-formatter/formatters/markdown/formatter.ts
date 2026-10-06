import type { TextFormatterStrategy } from '../types'

export const markdownFormatter: TextFormatterStrategy = {
  id: 'markdown',
  labelKey: 'text.format.markdown',
  badgeClassName: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  detect: (source) => /^(?:#{1,6}\s|```|>\s|[-*+]\s|\d+[.)]\s|---+$)/m.test(source)
    || /\[[^\]]+\]\([^)]+\)/.test(source),
  format: formatMarkdown,
  minify: (source) => formatMarkdown(source).replace(/\n{2,}/g, '\n').trim(),
}

function formatMarkdown(input: string): string {
  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []
  let inCodeBlock = false

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '')
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      output.push(line.trim())
      continue
    }
    if (inCodeBlock) {
      output.push(line)
      continue
    }
    output.push(normalizeMarkdownLine(line))
  }

  return output.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(#{1,6} .+)$/gm, '\n$1')
    .replace(/^\n+/, '')
    .trimEnd()
}

function normalizeMarkdownLine(line: string): string {
  const heading = line.match(/^\s*(#{1,6})\s*(.*)$/)
  if (heading?.[2]) return `${heading[1]} ${heading[2].trim()}`

  const unorderedListItem = line.match(/^\s*[-*+]\s+(.*)$/)
  if (unorderedListItem) return `- ${unorderedListItem[1].trim()}`

  const orderedListItem = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
  return orderedListItem ? `${orderedListItem[1]}. ${orderedListItem[2].trim()}` : line
}