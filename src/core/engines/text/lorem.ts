const WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
]

function pick<T>(items: T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length]
}

function randomIndex(max: number): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] % max
  }
  return Math.floor(Math.random() * max)
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

export function generateRandomWords(count: number): string {
  return Array.from({ length: Math.max(0, count) }, () =>
    pick(WORDS, randomIndex(WORDS.length)),
  ).join(' ')
}

export function generateRandomSentence(): string {
  const length = 6 + randomIndex(10)
  const text = generateRandomWords(length)
  return text[0].toUpperCase() + text.slice(1) + '.'
}

export function generateRandomSentences(count: number): string {
  return Array.from({ length: Math.max(0, count) }, () => generateRandomSentence()).join(' ')
}

export function generateRandomParagraphs(count: number): string {
  return Array.from({ length: Math.max(0, count) }, () =>
    Array.from({ length: 3 + randomIndex(3) }, () => generateRandomSentence()).join(' '),
  ).join('\n\n')
}

export type LoremMode = 'paragraphs' | 'sentences' | 'words'

export type DummyTextVariant = 'lorem' | 'random'

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

export function generateDummyText(
  mode: LoremMode,
  count: number,
  variant: DummyTextVariant,
): string {
  if (variant === 'lorem') return generateLorem(mode, count)
  switch (mode) {
    case 'paragraphs':
      return generateRandomParagraphs(count)
    case 'sentences':
      return generateRandomSentences(count)
    case 'words':
      return generateRandomWords(count)
  }
}
