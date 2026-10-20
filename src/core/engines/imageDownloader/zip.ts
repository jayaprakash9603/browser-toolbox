import { zipSync } from 'fflate'

import { applyFilenameTemplate, type FilenameContext } from './filename'

export interface ZipEntryInput {
  url: string
  bytes: Uint8Array
  context: FilenameContext
}

export function buildImagesZip(
  entries: ZipEntryInput[],
  filenameTemplate: string,
): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  const used = new Set<string>()
  for (const entry of entries) {
    let name = applyFilenameTemplate(filenameTemplate, entry.context)
    let counter = 1
    while (used.has(name)) {
      const dot = name.lastIndexOf('.')
      const base = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      name = `${base}-${counter}${ext}`
      counter += 1
    }
    used.add(name)
    files[name] = entry.bytes
  }
  return zipSync(files)
}
