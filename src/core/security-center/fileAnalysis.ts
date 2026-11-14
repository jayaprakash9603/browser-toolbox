import { checkExtension, detectSignature, extensionOf } from '@/core/engines/hash/signature'
import { isRiskyFile } from '@/core/protection/downloads'

export interface FileAnalysisReport {
  name: string
  extension: string
  mime: string
  size: number
  sha256?: string
  signatureId?: string
  signatureLabel?: string
  riskyType: boolean
  doubleExtension: boolean
  extensionMismatch: boolean
  notes: string[]
  disclaimer: string
}

const ARCHIVE_PAIRS = new Set(['tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst'])

export function hasSuspiciousDoubleExtension(name: string): boolean {
  const base = name.split(/[\\/]/).pop() ?? name
  const parts = base.toLowerCase().split('.')
  if (parts.length < 3) return false
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
  if (ARCHIVE_PAIRS.has(lastTwo)) return false
  const last = parts[parts.length - 1]
  const inner = parts[parts.length - 2]
  if (!inner || !last) return false
  return isRiskyFile(base, '', '')
}

export function analyzeFileLocal(input: {
  name: string
  mime: string
  size: number
  head?: Uint8Array
  sha256?: string
}): FileAnalysisReport {
  const extension = extensionOf(input.name)
  const signature = input.head ? detectSignature(input.head) : null
  const mismatch = signature ? checkExtension(input.name, signature) === 'mismatch' : false
  const doubleExtension = hasSuspiciousDoubleExtension(input.name)
  const riskyType = isRiskyFile(input.name, '', input.mime)
  const notes: string[] = []
  if (riskyType) notes.push('The name or MIME type is associated with executable or script content.')
  if (doubleExtension) notes.push('The file name uses a double extension that can hide the real type.')
  if (mismatch) notes.push('The detected file signature does not match the name extension.')
  if (!signature) notes.push('No well-known magic-byte signature was detected in the sample.')
  if (input.size === 0) notes.push('The file is empty.')
  return {
    name: input.name,
    extension,
    mime: input.mime || 'application/octet-stream',
    size: input.size,
    sha256: input.sha256,
    signatureId: signature?.id,
    signatureLabel: signature?.label,
    riskyType,
    doubleExtension,
    extensionMismatch: mismatch,
    notes,
    disclaimer:
      'These checks are local file observations. They are not antivirus scanning and cannot prove a file is safe or malicious.',
  }
}

export const FILE_SCAN_SIZE_LIMIT = 50 * 1024 * 1024
