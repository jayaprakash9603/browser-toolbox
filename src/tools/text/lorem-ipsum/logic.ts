const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
]

function pick<T>(items: T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length]
}

export function generateWords(count: number, seed = 0): string {
  return Array.from({ length: Math.max(0, count) }, (_, i) => pick(WORDS, i * 7 + seed)).join(' ')
}

export function generateSentence(seed = 0): string {
  const length = 8 + (seed % 8)
  const text = generateWords(length, seed)
  return text[0].toUpperCase() + text.slice(1) + '.'
}

export function generateSentences(count: number): string {
  return Array.from({ length: Math.max(0, count) }, (_, i) => generateSentence(i * 13)).join(' ')
}

export function generateParagraphs(count: number): string {
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    Array.from({ length: 3 + (i % 3) }, (_, j) => generateSentence(i * 31 + j * 17)).join(' '),
  ).join('\n\n')
}

export type LoremMode = 'paragraphs' | 'sentences' | 'words'

export function generateLorem(mode: LoremMode, count: number): string {
  switch (mode) {
    case 'paragraphs':
      return generateParagraphs(count)
    case 'sentences':
      return generateSentences(count)
    case 'words':
      return generateWords(count)
  }
}
