import { gunzipSync, gzipSync, unzipSync, zipSync, type Zippable } from 'fflate'

export type CompressionLevel = 0 | 1 | 6 | 9

/** Formats that are already compressed; deflating them again only costs time. */
const PRECOMPRESSED = new Set([
  'zip', 'gz', 'tgz', '7z', 'rar', 'xz', 'bz2', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'heic',
  'mp4', 'mov', 'mkv', 'webm', 'mp3', 'm4a', 'aac', 'ogg', 'flac', 'pdf', 'docx', 'xlsx', 'pptx',
  'woff', 'woff2', 'jar', 'apk', 'epub',
])

const ZIP_EPOCH = Date.UTC(1980, 0, 2)

export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5)
}

function extension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function gzipFile(bytes: Uint8Array, name: string, level: CompressionLevel = 6, modified = Date.now()): Uint8Array {
  return gzipSync(bytes, { level, filename: name, mtime: Math.max(modified, ZIP_EPOCH) })
}

/** Reads the optional original file name stored in a gzip header (FNAME). */
export function gzipStoredName(bytes: Uint8Array): string | null {
  if (!isGzip(bytes) || bytes.length < 10) return null
  const flags = bytes[3]
  let offset = 10
  if (flags & 0x04) offset += 2 + (bytes[10] | (bytes[11] << 8))
  if (!(flags & 0x08)) return null
  let end = offset
  while (end < bytes.length && bytes[end] !== 0) end += 1
  const name = new TextDecoder('latin1').decode(bytes.subarray(offset, end)).split(/[\\/]/).pop()
  return name || null
}

export function gunzipFile(bytes: Uint8Array, archiveName: string): { bytes: Uint8Array; name: string } {
  const output = gunzipSync(bytes)
  const stored = gzipStoredName(bytes)
  const fallback = /\.tgz$/i.test(archiveName)
    ? archiveName.replace(/\.tgz$/i, '.tar')
    : archiveName.replace(/\.gz$/i, '') || 'decompressed'
  return { bytes: output, name: stored ?? (fallback === archiveName ? `${archiveName}.out` : fallback) }
}

export function uniqueName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  let candidate = name
  for (let index = 2; used.has(candidate.toLowerCase()); index += 1) candidate = `${stem} (${index})${ext}`
  used.add(candidate.toLowerCase())
  return candidate
}

export interface ZipInput {
  name: string
  bytes: Uint8Array
  lastModified?: number
}

export function zipEntries(files: ZipInput[], level: CompressionLevel = 6): Uint8Array {
  const used = new Set<string>()
  const zippable: Zippable = {}
  for (const file of files) {
    const name = uniqueName(file.name.replace(/^[/\\]+/, '') || 'file', used)
    zippable[name] = [
      file.bytes,
      {
        level: PRECOMPRESSED.has(extension(name)) ? 0 : level,
        mtime: Math.max(file.lastModified ?? Date.now(), ZIP_EPOCH),
      },
    ]
  }
  return zipSync(zippable)
}

export interface ArchiveEntry {
  path: string
  name: string
  folder: string
  size: number
  bytes: Uint8Array
}

export function unzipEntries(bytes: Uint8Array): ArchiveEntry[] {
  const files = unzipSync(bytes)
  return Object.entries(files)
    .filter(([path]) => !path.endsWith('/'))
    .map(([path, data]) => {
      const slash = path.lastIndexOf('/')
      return {
        path,
        name: slash >= 0 ? path.slice(slash + 1) : path,
        folder: slash >= 0 ? path.slice(0, slash) : '',
        size: data.length,
        bytes: data,
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
}
