import { strToU8, zipSync } from 'fflate'

import { applyFilenameTemplate, type FilenameContext } from './filename'

export interface ZipEntryInput {
  url: string
  bytes: Uint8Array
  context: FilenameContext
}

export interface ZipTextFile {
  name: string
  text: string
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name
  let counter = 1
  while (used.has(candidate)) {
    const dot = name.lastIndexOf('.')
    const base = dot > 0 ? name.slice(0, dot) : name
    const ext = dot > 0 ? name.slice(dot) : ''
    candidate = `${base}-${counter}${ext}`
    counter += 1
  }
  used.add(candidate)
  return candidate
}

export function buildImagesZip(
  entries: ZipEntryInput[],
  filenameTemplate: string,
  textFiles: ZipTextFile[] = [],
): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  const used = new Set<string>()
  for (const file of textFiles) {
    const name = file.name.replace(/[\\/:*?"<>|]/g, '_').trim()
    if (!name) continue
    files[uniqueName(name, used)] = strToU8(file.text)
  }
  for (const entry of entries) {
    files[uniqueName(applyFilenameTemplate(filenameTemplate, entry.context), used)] = entry.bytes
  }
  return zipSync(files)
}
