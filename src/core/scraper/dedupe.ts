import type { ScrapeRow } from './types'

function rowFingerprint(row: ScrapeRow): string {
  const keys = Object.keys(row).sort()
  return keys.map((k) => `${k}:${row[k]}`).join('|')
}

export function dedupeRows(existing: ScrapeRow[], incoming: ScrapeRow[]): ScrapeRow[] {
  const seen = new Set(existing.map(rowFingerprint))
  const out = [...existing]
  for (const row of incoming) {
    const fp = rowFingerprint(row)
    if (seen.has(fp)) continue
    seen.add(fp)
    out.push(row)
  }
  return out
}

export function mergeRowsCapped(
  existing: ScrapeRow[],
  incoming: ScrapeRow[],
  cap: number,
): { rows: ScrapeRow[]; warning?: string } {
  const merged = dedupeRows(existing, incoming)
  if (merged.length <= cap) return { rows: merged }
  return {
    rows: merged.slice(0, cap),
    warning: `Row limit reached (${cap.toLocaleString()}). Older rows were kept.`,
  }
}
