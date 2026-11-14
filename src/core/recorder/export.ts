import { zipBlobs } from '@/core/screenshot/export'

import { safeFileName } from './format'
import { extensionForMime } from './mime'
import { getRecordingBlob } from './store'
import type { RecordingMeta } from './types'

export function recordingsZipFilename(date = new Date()): string {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `screen-recordings-${stamp}.zip`
}

function zipEntryName(meta: RecordingMeta, index: number, used: Set<string>): string {
  const ext = extensionForMime(meta.mimeType)
  const base = safeFileName(meta.name)
  const prefix = String(index + 1).padStart(2, '0')
  let name = `${prefix}-${base}.${ext}`
  let attempt = 0
  while (used.has(name.toLowerCase())) {
    attempt += 1
    name = `${prefix}-${base}-${attempt}.${ext}`
  }
  used.add(name.toLowerCase())
  return name
}

function buildManifest(metas: RecordingMeta[], names: string[]): string {
  const lines = [
    'Screen recordings export',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Index\tFile\tDuration\tSize\tSource\tCreated',
  ]
  metas.forEach((meta, index) => {
    const created = new Date(meta.createdAt).toISOString()
    lines.push(
      [
        index + 1,
        names[index],
        `${Math.round(meta.durationMs / 1000)}s`,
        meta.size,
        meta.source,
        created,
      ].join('\t'),
    )
  })
  return lines.join('\n')
}

/** Oldest first inside the archive, with a small index file at the root. */
export async function recordingsToZip(metas: RecordingMeta[]): Promise<Blob> {
  const sorted = [...metas].sort((a, b) => a.createdAt - b.createdAt)
  const used = new Set<string>()
  const names: string[] = []
  const files: { name: string; blob: Blob }[] = []
  for (let index = 0; index < sorted.length; index += 1) {
    const meta = sorted[index]
    const name = zipEntryName(meta, index, used)
    names.push(name)
    const blob = await getRecordingBlob(meta.id, meta.mimeType)
    files.push({ name, blob })
  }
  files.push({ name: 'recordings-index.txt', blob: new Blob([buildManifest(sorted, names)], { type: 'text/plain' }) })
  return zipBlobs(files)
}