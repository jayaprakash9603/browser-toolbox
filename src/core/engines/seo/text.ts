const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'it',
  'this',
  'that',
  'as',
  'if',
  'not',
  'your',
  'you',
  'we',
  'our',
])

export function textToCodeRatio(bodyTextLength: number, htmlBytes: number): number {
  if (htmlBytes <= 0) return 0
  return Math.round((bodyTextLength / htmlBytes) * 1000) / 10
}

export function keywordDensity(
  text: string,
  n: 1 | 2 | 3,
  limit = 10,
): { phrase: string; count: number; density: number }[] {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  if (words.length === 0) return []

  const counts = new Map<string, number>()
  if (n === 1) {
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1)
  } else {
    for (let i = 0; i <= words.length - n; i += 1) {
      const phrase = words.slice(i, i + n).join(' ')
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
    }
  }

  const total = n === 1 ? words.length : Math.max(1, words.length - n + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({
      phrase,
      count,
      density: Math.round((count / total) * 10000) / 100,
    }))
}

export function averageSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  if (sentences.length === 0) return 0
  const words = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0)
  return Math.round((words / sentences.length) * 10) / 10
}

export function containsLorem(text: string): boolean {
  return /\blorem ipsum\b/i.test(text)
}

export function estimateTitlePixelWidth(title: string): number {
  return Math.round(title.length * 5.5)
}
