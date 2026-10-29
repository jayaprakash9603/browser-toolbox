import { DETECTION_ENGINE_VERSION } from './detect'
import { categoryLabel } from './categories'
import type { TechScan } from './types'

const CSV_HEADER = [
  'Name',
  'Category',
  'Version',
  'Website',
  'Detected by',
  'Confidence',
  'Confidence level',
  'Inferred',
  'Evidence sources',
  'Page URL',
  'Scanned at',
]

/** Quotes when needed and defuses names a spreadsheet would run as a formula. */
function csvCell(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function scanHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'page'
  } catch {
    return 'page'
  }
}

export function techScanToCsv(scan: TechScan): string {
  const rows = scan.hits.map((hit) => [
    hit.name,
    categoryLabel(hit.category),
    hit.version ?? '',
    hit.website ?? '',
    hit.evidence,
    hit.confidence.toFixed(2),
    hit.confidenceLevel,
    hit.implied ? 'true' : 'false',
    hit.evidenceItems.map((item) => item.detail).join('; '),
    scan.url,
    scan.scannedAt,
  ])
  return [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function techScanToJson(scan: TechScan): string {
  return `${JSON.stringify(
    {
      website: scanHost(scan.url),
      url: scan.url,
      scannedAt: scan.scannedAt,
      durationMs: scan.durationMs ?? 0,
      engineVersion: scan.engineVersion ?? DETECTION_ENGINE_VERSION,
      headersAvailable: scan.headersAvailable ?? false,
      protocol: scan.protocol ?? null,
      technologies: scan.hits.map((hit) => ({
        name: hit.name,
        category: hit.category,
        categoryLabel: categoryLabel(hit.category),
        version: hit.version ?? null,
        website: hit.website ?? null,
        description: hit.description ?? null,
        confidence: hit.confidence,
        confidenceLevel: hit.confidenceLevel,
        inferred: Boolean(hit.implied),
        evidence: hit.evidenceItems,
        detectedAt: scan.scannedAt,
      })),
    },
    null,
    2,
  )}\n`
}

export function techScanFilename(scan: TechScan, extension: 'csv' | 'json' = 'csv'): string {
  return `tech-stack-${scanHost(scan.url)}.${extension}`
}
