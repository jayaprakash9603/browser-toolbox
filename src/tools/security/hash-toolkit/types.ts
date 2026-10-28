import type { BlobDigest } from '@/core/engines/hash/digests'
import type { BaselineVerdict } from './baselineStore'

export interface HashQueueItem {
  id: string
  file: File
  path: string
  status: 'pending' | 'hashing' | 'done' | 'error'
  progress: number
  result?: BlobDigest
  error?: string
  hashedAt?: string
  baseline?: BaselineVerdict
}

export function toEvidencePath(file: File): string {
  return file.webkitRelativePath?.replace(/\\/g, '/') || file.name
}
