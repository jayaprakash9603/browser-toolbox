import { categoryLabel } from './categories'
import type { TechScan } from './types'

const CSV_HEADER = ['Name', 'Category', 'Version', 'Website', 'Detected by', 'Page URL', 'Scanned at']

/** Quotes when needed and defuses names a spreadsheet would run as a formula. */
function csvCell(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function techScanToCsv(scan: TechScan): string {
  const rows = scan.hits.map((hit) => [
    hit.name,
    categoryLabel(hit.category),
    hit.version ?? '',
    hit.website ?? '',
    hit.evidence,
    scan.url,
    scan.scannedAt,
  ])
  return [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function techScanFilename(scan: TechScan): string {
  let host = 'page'
  try {
    host = new URL(scan.url).hostname.replace(/^www\./, '') || host
  } catch {
    /* keep the generic name for pages without a host */
  }
  return `tech-stack-${host}.csv`
}
