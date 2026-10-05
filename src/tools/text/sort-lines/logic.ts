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
