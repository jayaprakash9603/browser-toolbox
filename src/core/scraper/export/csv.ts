import { recordsToCsv } from '@/core/engines/csv'

import type { ScrapeColumn, ScrapeRow } from '../types'

function guardFormula(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`
  return value
}

export function rowsToDisplayRecords(
  rows: ScrapeRow[],
  columns: ScrapeColumn[],
): Record<string, string>[] {
  const visible = columns.filter((c) => !c.hidden).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const keys = visible.length ? visible.map((c) => c.key) : undefined
  const labelMap = new Map(visible.map((c) => [c.key, c.label || c.key]))
  return rows.map((row) => {
    const out: Record<string, string> = {}
    const useKeys = keys ?? Object.keys(row)
    for (const key of useKeys) {
      const label = labelMap.get(key) ?? key
      out[label] = guardFormula(row[key] ?? '')
    }
    return out
  })
}

export function exportScrapeCsv(rows: ScrapeRow[], columns: ScrapeColumn[]): string {
  const records = rowsToDisplayRecords(rows, columns)
  const body = recordsToCsv(records)
  return `\uFEFF${body.replace(/\n/g, '\r\n')}`
}
