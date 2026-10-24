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

export type LoremMode = 'paragraphs' | 'sentences' | 'words' | 'lines'

export type DummyTextVariant = 'lorem' | 'random'

export type DummyLineKind = 'text' | 'names' | 'emails' | 'uuids'

export type DummyTextFormat = 'plain' | 'html' | 'markdown' | 'json'

export type DummySentenceLength = 'short' | 'medium' | 'long'

export const LOREM_OPENING =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

const FIRST_NAMES = [
  'Ada',
  'Grace',
  'Alan',
  'Katherine',
  'Linus',
  'Margaret',
  'Dennis',
  'Barbara',
  'James',
  'Radia',
  'Donald',
  'Frances',
]

const LAST_NAMES = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Johnson',
  'Torvalds',
  'Hamilton',
  'Ritchie',
  'Liskov',
  'Gosling',
  'Perlman',
  'Knuth',
  'Allen',
]

function sentenceWordCount(length: DummySentenceLength, seed: number): number {
  switch (length) {
    case 'short':
      return 5 + (seed % 4)
    case 'long':
      return 14 + (seed % 8)
    default:
      return 8 + (seed % 6)
  }
}

function generateSentenceWithLength(seed: number, length: DummySentenceLength): string {
  const wordCount = sentenceWordCount(length, seed)
  const text = generateWords(wordCount, seed)
  return text[0].toUpperCase() + text.slice(1) + '.'
}

function generateRandomSentenceWithLength(length: DummySentenceLength): string {
  const wordCount =
    length === 'short' ? 5 + randomIndex(4) : length === 'long' ? 14 + randomIndex(8) : 8 + randomIndex(6)
  const text = generateRandomWords(wordCount)
  return text[0].toUpperCase() + text.slice(1) + '.'
}

function generateParagraphsWithLength(count: number, length: DummySentenceLength, variant: DummyTextVariant): string {
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    Array.from({ length: 3 + (i % 3) }, (_, j) =>
      variant === 'lorem'
        ? generateSentenceWithLength(i * 31 + j * 17, length)
        : generateRandomSentenceWithLength(length),
    ).join(' '),
  ).join('\n\n')
}

function generateSentencesWithLength(
  count: number,
  length: DummySentenceLength,
  variant: DummyTextVariant,
): string {
  return Array.from({ length: Math.max(0, count) }, (_, i) =>
    variant === 'lorem' ? generateSentenceWithLength(i * 13, length) : generateRandomSentenceWithLength(length),
  ).join(' ')
}

function randomName(): string {
  return `${pick(FIRST_NAMES, randomIndex(FIRST_NAMES.length))} ${pick(LAST_NAMES, randomIndex(LAST_NAMES.length))}`
}

function randomEmail(): string {
  const user = pick(WORDS, randomIndex(WORDS.length)) + pick(WORDS, randomIndex(WORDS.length))
  const host = pick(['example', 'mail', 'demo', 'test'], randomIndex(4))
  const tld = pick(['com', 'io', 'dev', 'app'], randomIndex(4))
  return `${user}@${host}.${tld}`
}

function randomUuid(): string {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function generateLines(count: number, kind: DummyLineKind, variant: DummyTextVariant): string[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    switch (kind) {
      case 'names':
        return randomName()
      case 'emails':
        return randomEmail()
      case 'uuids':
        return randomUuid()
      default:
        return variant === 'lorem'
          ? generateSentenceWithLength(i * 19, 'short')
          : generateRandomSentenceWithLength('short')
    }
  })
}

function applyStartWithLorem(text: string, mode: LoremMode): string {
  if (!text) return text
  if (mode === 'paragraphs') {
    const parts = text.split('\n\n')
    parts[0] = LOREM_OPENING + (parts[0] ? ` ${parts[0]}` : '')
    return parts.join('\n\n')
  }
  if (mode === 'sentences') {
    return LOREM_OPENING + (text ? ` ${text}` : '')
  }
  return text
}

function formatDummyOutput(text: string, lines: string[] | null, format: DummyTextFormat, mode: LoremMode): string {
  if (format === 'plain') {
    return lines ? lines.join('\n') : text
  }
  if (format === 'json') {
    if (lines) return JSON.stringify(lines, null, 2)
    if (mode === 'words') return JSON.stringify(text.split(/\s+/).filter(Boolean), null, 2)
    if (mode === 'paragraphs') return JSON.stringify(text.split('\n\n').filter(Boolean), null, 2)
    if (mode === 'sentences') return JSON.stringify(text.split(/(?<=\.)\s+/).filter(Boolean), null, 2)
    return JSON.stringify([text], null, 2)
  }
  if (format === 'markdown') {
    if (lines) return lines.map((line) => `- ${line}`).join('\n')
    if (mode === 'paragraphs') return text
    return text
  }
  if (format === 'html') {
    if (lines) {
      return `<ul>\n${lines.map((line) => `  <li>${escapeHtml(line)}</li>`).join('\n')}\n</ul>`
    }
    if (mode === 'paragraphs') {
      return text
        .split('\n\n')
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('\n')
    }
    if (mode === 'sentences' || mode === 'words') {
      return `<p>${escapeHtml(text)}</p>`
    }
  }
  return text
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export interface DummyTextRequest {
  mode: LoremMode
  count: number
  variant: DummyTextVariant
  format?: DummyTextFormat
  lineKind?: DummyLineKind
  startWithLorem?: boolean
  sentenceLength?: DummySentenceLength
}

export function buildDummyText({
  mode,
  count,
  variant,
  format = 'plain',
  lineKind = 'text',
  startWithLorem = false,
  sentenceLength = 'medium',
}: DummyTextRequest): string {
  let text = ''
  let lines: string[] | null = null

  if (mode === 'lines') {
    lines = generateLines(count, lineKind, variant)
  } else if (variant === 'lorem') {
    if (mode === 'paragraphs') text = generateParagraphsWithLength(count, sentenceLength, 'lorem')
    else if (mode === 'sentences') text = generateSentencesWithLength(count, sentenceLength, 'lorem')
    else text = generateWords(count)
  } else {
    if (mode === 'paragraphs') text = generateParagraphsWithLength(count, sentenceLength, 'random')
    else if (mode === 'sentences') text = generateSentencesWithLength(count, sentenceLength, 'random')
    else text = generateRandomWords(count)
  }

  if (startWithLorem && variant === 'lorem' && mode !== 'words' && mode !== 'lines') {
    text = applyStartWithLorem(text, mode)
  }

  return formatDummyOutput(text, lines, format, mode)
}

export function generateLorem(mode: LoremMode, count: number): string {
  switch (mode) {
    case 'paragraphs':
      return generateParagraphs(count)
    case 'sentences':
      return generateSentences(count)
    case 'words':
      return generateWords(count)
    case 'lines':
      return generateLines(count, 'text', 'lorem').join('\n')
  }
}

export function generateDummyText(
  mode: LoremMode,
  count: number,
  variant: DummyTextVariant,
): string {
  if (mode === 'lines') {
    return buildDummyText({ mode, count, variant, lineKind: 'text' })
  }
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
