import { ALL_DIGESTS, digestBytes, type DigestAlgorithm, type Digests } from './digests'

export interface EvidenceItem {
  path: string
  size: number
  /** MIME type the browser reported from the name; empty when unknown. */
  reportedType: string
  lastModified: number
  hashedAt: string
  digests: Digests
  detectedType: string | null
  extension: 'match' | 'mismatch' | 'unknown'
  entropy: number
}

export interface EvidenceContext {
  caseReference?: string
  examiner?: string
  note?: string
}

export interface EvidenceReport {
  format: 'one-panel.hash-evidence'
  version: 1
  generatedAt: string
  generator: string
  case: EvidenceContext
  items: EvidenceItem[]
  /** SHA-256 over the report with this field empty; recompute to show the report was not edited. */
  seal: string
}

const GENERATOR = 'One Panel · Hash Toolkit (computed locally in the browser)'

function canonical(report: Omit<EvidenceReport, 'seal'>): string {
  return JSON.stringify({ ...report, seal: '' })
}

export async function buildEvidenceReport(
  items: readonly EvidenceItem[],
  context: EvidenceContext,
  now = new Date(),
): Promise<EvidenceReport> {
  const body: Omit<EvidenceReport, 'seal'> = {
    format: 'one-panel.hash-evidence',
    version: 1,
    generatedAt: now.toISOString(),
    generator: GENERATOR,
    case: Object.fromEntries(Object.entries(context).filter(([, value]) => value?.trim())),
    items: [...items],
  }
  const { 'SHA-256': seal = '' } = await digestBytes(new TextEncoder().encode(canonical(body)), [
    'SHA-256',
  ])
  return { ...body, seal }
}

/** True when a report's seal still matches its content. */
export async function verifyEvidenceSeal(report: EvidenceReport): Promise<boolean> {
  const { seal, ...body } = report
  const { 'SHA-256': actual } = await digestBytes(new TextEncoder().encode(canonical(body)), [
    'SHA-256',
  ])
  return actual === seal
}

/** Quotes when needed and defuses names a spreadsheet would run as a formula. */
function csvCell(value: string | number): string {
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(
  items: readonly EvidenceItem[],
  algorithms: readonly DigestAlgorithm[] = ALL_DIGESTS,
): string {
  const header = [
    'path',
    'size_bytes',
    'last_modified',
    'hashed_at',
    'detected_type',
    'extension_check',
    'entropy',
    ...algorithms,
  ]
  const rows = items.map((item) => [
    item.path,
    item.size,
    new Date(item.lastModified).toISOString(),
    item.hashedAt,
    item.detectedType ?? '',
    item.extension,
    item.entropy.toFixed(4),
    ...algorithms.map((a) => item.digests[a] ?? ''),
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
