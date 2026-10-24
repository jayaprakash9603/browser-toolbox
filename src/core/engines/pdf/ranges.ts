export type PageRangeIssue =
  | { kind: 'empty' }
  | { kind: 'syntax'; token: string }
  | { kind: 'outOfRange'; token: string; total: number }

export type PageRangeResult = { ok: true; groups: number[][] } | { ok: false; issue: PageRangeIssue }

const TOKEN = /^(\d*)(-?)(\d*)$/

/**
 * Parses "1-3, 5, 8-" into zero-based page groups, one group per comma-separated part.
 * Open ends run to the first or last page and "5-2" lists pages in reverse.
 */
export function parsePageRanges(input: string, total: number): PageRangeResult {
  const tokens = input
    .replace(/\s*[-–]\s*/g, '-')
    .split(/[,;\s]+/)
    .filter(Boolean)
  if (tokens.length === 0) return { ok: false, issue: { kind: 'empty' } }

  const groups: number[][] = []
  for (const token of tokens) {
    const match = TOKEN.exec(token)
    if (!match || (!match[1] && !match[3]) || (!match[2] && !match[1])) return { ok: false, issue: { kind: 'syntax', token } }
    const start = match[1] ? Number(match[1]) : 1
    const end = match[2] ? (match[3] ? Number(match[3]) : total) : start
    if (start < 1 || end < 1 || start > total || end > total) {
      return { ok: false, issue: { kind: 'outOfRange', token, total } }
    }
    const step = start <= end ? 1 : -1
    const group: number[] = []
    for (let page = start; page !== end + step; page += step) group.push(page - 1)
    groups.push(group)
  }
  return { ok: true, groups }
}

/** Unique pages from a range expression, in first-mentioned order. */
export function parsePageSelection(input: string, total: number): PageRangeResult {
  const result = parsePageRanges(input, total)
  if (!result.ok) return result
  return { ok: true, groups: [[...new Set(result.groups.flat())]] }
}

export function splitEvery(total: number, size: number): number[][] {
  const step = Math.max(1, Math.floor(size))
  const groups: number[][] = []
  for (let start = 0; start < total; start += step) {
    groups.push(Array.from({ length: Math.min(step, total - start) }, (_, offset) => start + offset))
  }
  return groups
}

/** One-based label for zero-based pages, collapsing runs: [0,1,2,4] → "1-3, 5". */
export function describePages(pages: readonly number[]): string {
  const parts: string[] = []
  let index = 0
  while (index < pages.length) {
    let end = index
    while (end + 1 < pages.length && pages[end + 1] === pages[end] + 1) end += 1
    parts.push(end > index ? `${pages[index] + 1}-${pages[end] + 1}` : `${pages[index] + 1}`)
    index = end + 1
  }
  return parts.join(', ')
}
