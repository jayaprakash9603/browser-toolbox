export interface TextStats {
  words: number
  characters: number
  charactersNoSpaces: number
  lines: number
  blankLines: number
  paragraphs: number
  sentences: number
  readingTimeSeconds: number
}

export function countLines(input: string): { total: number; blank: number; nonBlank: number } {
  if (!input) return { total: 0, blank: 0, nonBlank: 0 }
  const lines = input.split('\n')
  const blank = lines.filter((line) => line.trim() === '').length
  return { total: lines.length, blank, nonBlank: lines.length - blank }
}

const WORDS_PER_MINUTE = 200

export function analyzeText(input: string): TextStats {
  const trimmed = input.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const sentences = trimmed ? (trimmed.match(/[.!?…]+(?=\s|$)/g) ?? []).length || 1 : 0
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0
  const { total, blank } = countLines(input)

  return {
    words,
    characters: input.length,
    charactersNoSpaces: input.replace(/\s/g, '').length,
    lines: total,
    blankLines: blank,
    paragraphs,
    sentences,
    readingTimeSeconds: Math.ceil((words / WORDS_PER_MINUTE) * 60),
  }
}

export function formatReadingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}
