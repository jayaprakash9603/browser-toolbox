import { rowsToDisplayRecords } from './csv'
import type { ScrapeColumn, ScrapeRow } from '../types'

function escapeTsv(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
}

export function exportScrapeTsv(rows: ScrapeRow[], columns: ScrapeColumn[]): string {
  const records = rowsToDisplayRecords(rows, columns)
  if (!records.length) return ''
  const headers = Object.keys(records[0])
  const lines = [
    headers.map(escapeTsv).join('\t'),
    ...records.map((r) => headers.map((h) => escapeTsv(r[h] ?? '')).join('\t')),
  ]
  return lines.join('\n')
}
