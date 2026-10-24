import { zipEntries } from '@/core/engines/files/archive'
import type { DocBlock, DocumentSettings } from '@/core/engines/files/document'
import { detectSignature, textHead } from '@/core/engines/files/inspect'
import type { PdfLayout } from '@/core/engines/files/pdfLayout'
import { downloadBlob } from '@/features/netmon/download'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'

export interface ArchiveEntryInfo {
  path: string
  size: number
}

export type ArtifactPreview =
  | { kind: 'pdf'; layout: PdfLayout }
  | { kind: 'document'; blocks: DocBlock[]; settings: DocumentSettings }
  | { kind: 'html'; html: string }
  | { kind: 'image'; width: number; height: number }
  | { kind: 'text'; text: string; language: EditorLanguage; rows?: string[][] }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'archive'; entries: ArchiveEntryInfo[] }
  /** A finished PDF rendered with PDF.js; `password` opens an encrypted file. */
  | { kind: 'pdfFile'; password?: string }
  | { kind: 'binary' }

/** A generated file held in memory until the user previews and saves it. */
export interface FileArtifact {
  id: string
  name: string
  blob: Blob
  /** Short format label, e.g. "PDF". */
  format: string
  preview: ArtifactPreview
  source?: { name: string; size: number }
  /** Shown under the preview, e.g. a fidelity caveat. */
  note?: string
}

export function createArtifact(init: Omit<FileArtifact, 'id'>): FileArtifact {
  return { id: crypto.randomUUID(), ...init }
}

export function splitFileName(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? { stem: name.slice(0, dot), ext: name.slice(dot + 1) } : { stem: name, ext: '' }
}

export function downloadArtifact(artifact: FileArtifact, name = artifact.name): void {
  downloadBlob(artifact.blob, name)
}

export async function artifactsToZip(artifacts: FileArtifact[], names: Record<string, string> = {}): Promise<Blob> {
  const files = await Promise.all(
    artifacts.map(async (artifact) => ({
      name: names[artifact.id] ?? artifact.name,
      bytes: new Uint8Array(await artifact.blob.arrayBuffer()),
    })),
  )
  return bytesBlob(zipEntries(files), 'application/zip')
}

export function bytesBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type })
}

export function openArtifact(artifact: FileArtifact): void {
  const url = URL.createObjectURL(artifact.blob)
  window.open(url, '_blank', 'noopener')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function artifactText(artifact: FileArtifact): string | null {
  if (artifact.preview.kind === 'text') return artifact.preview.text
  if (artifact.preview.kind === 'html') return artifact.preview.html
  return null
}

const LANGUAGES: Record<string, EditorLanguage> = {
  json: 'json',
  jsonl: 'json',
  geojson: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  js: 'javascript',
  mjs: 'javascript',
  ts: 'javascript',
  tsx: 'javascript',
  jsx: 'javascript',
  sql: 'sql',
}

export function languageFor(name: string): EditorLanguage {
  return LANGUAGES[splitFileName(name).ext.toLowerCase()] ?? 'text'
}

const TEXT_PREVIEW_LIMIT = 2 * 1024 * 1024

async function imageSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== 'function') return null
  try {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

const MIME_BY_EXT: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

/** Builds a preview for bytes of unknown type, e.g. an archive entry or decoded Base64. */
export async function artifactFromBytes(
  name: string,
  bytes: Uint8Array,
  extra: Pick<FileArtifact, 'source' | 'note'> = {},
): Promise<FileArtifact> {
  const signature = detectSignature(bytes)
  const ext = splitFileName(name).ext.toLowerCase()
  const mime = signature?.mime ?? MIME_BY_EXT[ext] ?? 'application/octet-stream'
  const blob = bytesBlob(bytes, mime)
  const format = (signature?.ext || ext || 'bin').toUpperCase()

  if (mime.startsWith('image/')) {
    const size = await imageSize(blob)
    if (size) return createArtifact({ name, blob, format, preview: { kind: 'image', ...size }, ...extra })
  }
  if (mime === 'application/pdf') return createArtifact({ name, blob, format: 'PDF', preview: { kind: 'pdfFile' }, ...extra })
  if (bytes.length <= TEXT_PREVIEW_LIMIT && textHead(bytes) !== null) {
    const text = new TextDecoder().decode(bytes)
    return createArtifact({ name, blob, format, preview: { kind: 'text', text, language: languageFor(name) }, ...extra })
  }
  return createArtifact({ name, blob, format, preview: { kind: 'binary' }, ...extra })
}
