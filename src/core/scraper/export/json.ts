import { rowsToDisplayRecords } from './csv'
import type { ScrapeColumn, ScrapeRow } from '../types'

export function exportScrapeJson(rows: ScrapeRow[], columns: ScrapeColumn[], indent = 2): string {
  const records = rowsToDisplayRecords(rows, columns)
  return JSON.stringify(records, null, indent)
}
