export interface DedupeOptions {
  caseSensitive: boolean
  trimFirst: boolean
}

export interface DedupeResult {
  output: string
  removedCount: number
}

export function removeDuplicateLines(
  input: string,
  { caseSensitive, trimFirst }: DedupeOptions,
): DedupeResult {
  const seen = new Set<string>()
  const kept: string[] = []
  let removedCount = 0

  for (const line of input.split('\n')) {
    const candidate = trimFirst ? line.trim() : line
    const key = caseSensitive ? candidate : candidate.toLowerCase()
    if (seen.has(key)) {
      removedCount += 1
      continue
    }
    seen.add(key)
    kept.push(line)
  }

  return { output: kept.join('\n'), removedCount }
}

export type SortMode =
  | 'alpha-asc'
  | 'alpha-desc'
  | 'numeric-asc'
  | 'numeric-desc'
  | 'length-asc'
  | 'length-desc'

export const SORT_MODES: { id: SortMode; label: string }[] = [
  { id: 'alpha-asc', label: 'A → Z' },
  { id: 'alpha-desc', label: 'Z → A' },
  { id: 'numeric-asc', label: 'Numeric ↑' },
  { id: 'numeric-desc', label: 'Numeric ↓' },
  { id: 'length-asc', label: 'Shortest first' },
  { id: 'length-desc', label: 'Longest first' },
]

export function sortLines(input: string, mode: SortMode, caseSensitive = false): string {
  const lines = input.split('\n')
  const normalize = (value: string) => (caseSensitive ? value : value.toLowerCase())

  const comparators: Record<SortMode, (a: string, b: string) => number> = {
    'alpha-asc': (a, b) => normalize(a).localeCompare(normalize(b)),
    'alpha-desc': (a, b) => normalize(b).localeCompare(normalize(a)),
    'numeric-asc': (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0),
    'numeric-desc': (a, b) => (parseFloat(b) || 0) - (parseFloat(a) || 0),
    'length-asc': (a, b) => a.length - b.length,
    'length-desc': (a, b) => b.length - a.length,
  }

  return [...lines].sort(comparators[mode]).join('\n')
}

export function reverseLines(input: string): string {
  return input.split('\n').reverse().join('\n')
}

export function shuffleLines(input: string, random: () => number = Math.random): string {
  const lines = input.split('\n')
  for (let index = lines.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[lines[index], lines[swapIndex]] = [lines[swapIndex], lines[index]]
  }
  return lines.join('\n')
}

export interface LineNumberOptions {
  startAt?: number
  separator?: string
}

export function addLineNumbers(
  input: string,
  { startAt = 1, separator = '. ' }: LineNumberOptions = {},
): string {
  const start = Number.isFinite(startAt) ? Math.trunc(startAt) : 1
  return input
    .split('\n')
    .map((line, index) => `${start + index}${separator}${line}`)
    .join('\n')
}

const LINE_NUMBER_PREFIX = /^\s*\d+\s*[.):-]?\s+/

export function removeLineNumbers(input: string): string {
  return input
    .split('\n')
    .map((line) => line.replace(LINE_NUMBER_PREFIX, ''))
    .join('\n')
}

export function removeEmptyLines(input: string): string {
  return input
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n')
}
