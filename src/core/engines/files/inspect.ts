export interface FileSignature {
  label: string
  mime: string
  ext: string
}

interface SignatureRule extends FileSignature {
  bytes: (number | null)[]
  offset?: number
}

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))
const RIFF = [0x52, 0x49, 0x46, 0x46, null, null, null, null]

const RULES: SignatureRule[] = [
  { label: 'PNG image', mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { label: 'JPEG image', mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { label: 'GIF image', mime: 'image/gif', ext: 'gif', bytes: ascii('GIF8') },
  { label: 'WebP image', mime: 'image/webp', ext: 'webp', bytes: [...RIFF, ...ascii('WEBP')] },
  { label: 'WAV audio', mime: 'audio/wav', ext: 'wav', bytes: [...RIFF, ...ascii('WAVE')] },
  { label: 'AVI video', mime: 'video/x-msvideo', ext: 'avi', bytes: [...RIFF, ...ascii('AVI ')] },
  { label: 'PDF document', mime: 'application/pdf', ext: 'pdf', bytes: ascii('%PDF-') },
  { label: 'GZIP archive', mime: 'application/gzip', ext: 'gz', bytes: [0x1f, 0x8b] },
  { label: '7-Zip archive', mime: 'application/x-7z-compressed', ext: '7z', bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { label: 'RAR archive', mime: 'application/vnd.rar', ext: 'rar', bytes: ascii('Rar!\u001a\u0007') },
  { label: 'XZ archive', mime: 'application/x-xz', ext: 'xz', bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00] },
  { label: 'BZIP2 archive', mime: 'application/x-bzip2', ext: 'bz2', bytes: ascii('BZh') },
  { label: 'TAR archive', mime: 'application/x-tar', ext: 'tar', bytes: ascii('ustar'), offset: 257 },
  { label: 'SQLite database', mime: 'application/vnd.sqlite3', ext: 'sqlite', bytes: ascii('SQLite format 3\u0000') },
  { label: 'Office 97-2003 document', mime: 'application/x-ole-storage', ext: 'doc', bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  { label: 'Rich Text document', mime: 'application/rtf', ext: 'rtf', bytes: ascii('{\\rtf') },
  { label: 'Photoshop document', mime: 'image/vnd.adobe.photoshop', ext: 'psd', bytes: ascii('8BPS') },
  { label: 'BMP image', mime: 'image/bmp', ext: 'bmp', bytes: ascii('BM') },
  { label: 'Icon', mime: 'image/x-icon', ext: 'ico', bytes: [0x00, 0x00, 0x01, 0x00] },
  { label: 'TIFF image', mime: 'image/tiff', ext: 'tiff', bytes: [0x49, 0x49, 0x2a, 0x00] },
  { label: 'TIFF image', mime: 'image/tiff', ext: 'tiff', bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  { label: 'MP3 audio', mime: 'audio/mpeg', ext: 'mp3', bytes: ascii('ID3') },
  { label: 'FLAC audio', mime: 'audio/flac', ext: 'flac', bytes: ascii('fLaC') },
  { label: 'Ogg media', mime: 'audio/ogg', ext: 'ogg', bytes: ascii('OggS') },
  { label: 'WebM / Matroska video', mime: 'video/webm', ext: 'webm', bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { label: 'WebAssembly module', mime: 'application/wasm', ext: 'wasm', bytes: [0x00, 0x61, 0x73, 0x6d] },
  { label: 'ELF executable', mime: 'application/x-elf', ext: 'elf', bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { label: 'Windows executable', mime: 'application/vnd.microsoft.portable-executable', ext: 'exe', bytes: ascii('MZ') },
  { label: 'Mach-O binary', mime: 'application/x-mach-binary', ext: 'macho', bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { label: 'WOFF font', mime: 'font/woff', ext: 'woff', bytes: ascii('wOFF') },
  { label: 'WOFF2 font', mime: 'font/woff2', ext: 'woff2', bytes: ascii('wOF2') },
  { label: 'OpenType font', mime: 'font/otf', ext: 'otf', bytes: ascii('OTTO') },
  { label: 'TrueType font', mime: 'font/ttf', ext: 'ttf', bytes: [0x00, 0x01, 0x00, 0x00, 0x00] },
]

function matches(bytes: Uint8Array, rule: SignatureRule): boolean {
  const offset = rule.offset ?? 0
  if (bytes.length < offset + rule.bytes.length) return false
  return rule.bytes.every((value, index) => value === null || bytes[offset + index] === value)
}

const latin1 = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)

function zipFlavor(bytes: Uint8Array): FileSignature {
  const head = latin1(bytes.subarray(0, Math.min(bytes.length, 4096)))
  if (head.includes('mimetypeapplication/epub+zip')) return { label: 'EPUB book', mime: 'application/epub+zip', ext: 'epub' }
  if (head.includes('word/')) return { label: 'Word document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' }
  if (head.includes('xl/')) return { label: 'Excel workbook', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' }
  if (head.includes('ppt/')) return { label: 'PowerPoint deck', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx' }
  if (head.includes('META-INF/MANIFEST.MF')) return { label: 'Java archive', mime: 'application/java-archive', ext: 'jar' }
  return { label: 'ZIP archive', mime: 'application/zip', ext: 'zip' }
}

function isoFlavor(bytes: Uint8Array): FileSignature {
  const brand = latin1(bytes.subarray(8, 12))
  if (brand === 'qt  ') return { label: 'QuickTime video', mime: 'video/quicktime', ext: 'mov' }
  if (brand.startsWith('M4A')) return { label: 'M4A audio', mime: 'audio/mp4', ext: 'm4a' }
  if (brand === 'avif' || brand === 'avis') return { label: 'AVIF image', mime: 'image/avif', ext: 'avif' }
  if (['heic', 'heix', 'mif1', 'msf1'].includes(brand)) return { label: 'HEIC image', mime: 'image/heic', ext: 'heic' }
  return { label: 'MP4 video', mime: 'video/mp4', ext: 'mp4' }
}

/** Identifies a file from its first bytes instead of trusting the extension. */
export function detectSignature(bytes: Uint8Array): FileSignature | null {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5)) return zipFlavor(bytes)
  if (bytes.length >= 12 && latin1(bytes.subarray(4, 8)) === 'ftyp') return isoFlavor(bytes)
  for (const rule of RULES) if (matches(bytes, rule)) return { label: rule.label, mime: rule.mime, ext: rule.ext }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { label: 'MP3 audio', mime: 'audio/mpeg', ext: 'mp3' }
  }
  const text = textHead(bytes)
  if (text === null) return null
  const trimmed = text.replace(/^\ufeff/, '').trimStart().toLowerCase()
  if (trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))) {
    return { label: 'SVG image', mime: 'image/svg+xml', ext: 'svg' }
  }
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) return { label: 'HTML page', mime: 'text/html', ext: 'html' }
  if (trimmed.startsWith('<?xml')) return { label: 'XML document', mime: 'application/xml', ext: 'xml' }
  if (/^[{[]/.test(trimmed)) return { label: 'JSON text', mime: 'application/json', ext: 'json' }
  return { label: 'Plain text', mime: 'text/plain', ext: 'txt' }
}

const EXTENSION_ALIASES: Record<string, string[]> = {
  jpg: ['jpg', 'jpeg', 'jpe', 'jfif'],
  tiff: ['tif', 'tiff'],
  html: ['html', 'htm', 'xhtml'],
  gz: ['gz', 'tgz', 'gzip'],
  txt: ['txt', 'md', 'log', 'csv', 'tsv', 'ini', 'env', 'sql', 'yaml', 'yml', 'js', 'ts', 'css', 'py', 'srt', 'vtt', 'toml', 'conf', 'cfg', 'markdown', 'jsx', 'tsx', 'sh', 'bat'],
  json: ['json', 'geojson', 'jsonl', 'ndjson', 'har', 'webmanifest', 'map'],
  xml: ['xml', 'rss', 'atom', 'xsd', 'xsl', 'plist', 'kml', 'svg', 'xlf'],
  zip: ['zip'],
  exe: ['exe', 'dll', 'sys', 'scr', 'com', 'msi'],
  doc: ['doc', 'xls', 'ppt', 'msg', 'msi'],
  webm: ['webm', 'mkv', 'mka'],
  ogg: ['ogg', 'oga', 'ogv', 'opus'],
  mp4: ['mp4', 'm4v'],
  sqlite: ['sqlite', 'sqlite3', 'db'],
  ico: ['ico', 'cur'],
}

/** Null when the file has no extension or the signature is unknown. */
export function extensionMatches(fileName: string, signature: FileSignature | null): boolean | null {
  const dot = fileName.lastIndexOf('.')
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
  if (!ext || !signature) return null
  const allowed = EXTENSION_ALIASES[signature.ext] ?? [signature.ext]
  return allowed.includes(ext)
}

/** Decodes the head as UTF-8 when it looks like text; null for binary data. */
export function textHead(bytes: Uint8Array, limit = 4096): string | null {
  const head = bytes.subarray(0, Math.min(bytes.length, limit))
  if (head.length === 0) return ''
  let control = 0
  for (const byte of head) {
    if (byte === 0) return null
    if (byte < 0x20 && byte !== 9 && byte !== 10 && byte !== 13 && byte !== 12) control += 1
  }
  if (control / head.length > 0.02) return null
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(head)
  } catch {
    // A multi-byte character cut at the limit is still text.
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(head.subarray(0, Math.max(0, head.length - 3)))
    } catch {
      return null
    }
  }
}

export interface TextProfile {
  bom: 'utf-8' | 'utf-16le' | 'utf-16be' | null
  validUtf8: boolean
  lineEnding: 'LF' | 'CRLF' | 'CR' | 'mixed' | 'none'
  lines: number
  characters: number
  words: number
}

export function textProfile(bytes: Uint8Array): TextProfile | null {
  let bom: TextProfile['bom'] = null
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bom = 'utf-8'
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) bom = 'utf-16le'
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) bom = 'utf-16be'
  if (bom === 'utf-16le' || bom === 'utf-16be') {
    const text = new TextDecoder(bom).decode(bytes)
    return { bom, validUtf8: false, ...lineInfo(text) }
  }
  if (textHead(bytes) === null) return null
  let text: string
  let validUtf8 = true
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    validUtf8 = false
    text = new TextDecoder('utf-8').decode(bytes)
  }
  return { bom, validUtf8, ...lineInfo(text.replace(/^\ufeff/, '')) }
}

function lineInfo(text: string): Pick<TextProfile, 'lineEnding' | 'lines' | 'characters' | 'words'> {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length - crlf
  const cr = (text.match(/\r/g) ?? []).length - crlf
  const kinds = [crlf, lf, cr].filter((count) => count > 0).length
  const lineEnding = kinds === 0 ? 'none' : kinds > 1 ? 'mixed' : crlf ? 'CRLF' : lf ? 'LF' : 'CR'
  const lines = text ? text.split(/\r\n|\r|\n/).length - (/(\r\n|\r|\n)$/.test(text) ? 1 : 0) : 0
  return { lineEnding, lines, characters: [...text].length, words: (text.match(/\S+/g) ?? []).length }
}

export function convertLineEndings(text: string, ending: 'LF' | 'CRLF'): string {
  const normalized = text.replace(/\r\n?/g, '\n')
  return ending === 'CRLF' ? normalized.replace(/\n/g, '\r\n') : normalized
}

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512' | 'CRC32'

export const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512', 'CRC32']

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): string {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const MD5_SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
const MD5_CONSTANTS = Uint32Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32))

/** Works on raw bytes; SubtleCrypto has no MD5 and string-based libraries mangle binary data. */
export function md5Bytes(bytes: Uint8Array): string {
  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
  const words = new Uint32Array(16)
  const block = (source: Uint8Array, offset: number) => {
    for (let index = 0; index < 16; index += 1) {
      const at = offset + index * 4
      words[index] = source[at] | (source[at + 1] << 8) | (source[at + 2] << 16) | (source[at + 3] << 24)
    }
    let [a, b, c, d] = state
    for (let step = 0; step < 64; step += 1) {
      const round = step >> 4
      const mix = round === 0 ? (b & c) | (~b & d) : round === 1 ? (d & b) | (~d & c) : round === 2 ? b ^ c ^ d : c ^ (b | ~d)
      const word = round === 0 ? step : round === 1 ? (5 * step + 1) % 16 : round === 2 ? (3 * step + 5) % 16 : (7 * step) % 16
      const sum = (a + mix + MD5_CONSTANTS[step] + words[word]) | 0
      const shift = MD5_SHIFTS[round * 4 + (step % 4)]
      a = d
      d = c
      c = b
      b = (b + ((sum << shift) | (sum >>> (32 - shift)))) | 0
    }
    state[0] = (state[0] + a) | 0
    state[1] = (state[1] + b) | 0
    state[2] = (state[2] + c) | 0
    state[3] = (state[3] + d) | 0
  }
  const whole = bytes.length - (bytes.length % 64)
  for (let offset = 0; offset < whole; offset += 64) block(bytes, offset)
  const rest = bytes.length - whole
  const tail = new Uint8Array(rest < 56 ? 64 : 128)
  tail.set(bytes.subarray(whole))
  tail[rest] = 0x80
  const bits = bytes.length * 8
  const view = new DataView(tail.buffer)
  view.setUint32(tail.length - 8, bits >>> 0, true)
  view.setUint32(tail.length - 4, Math.floor(bits / 2 ** 32), true)
  for (let offset = 0; offset < tail.length; offset += 64) block(tail, offset)
  return state.map((word) => [0, 8, 16, 24].map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, '0')).join('')).join('')
}

export async function hashBytes(bytes: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'CRC32') return crc32(bytes)
  if (algorithm === 'MD5') return md5Bytes(bytes)
  const view = new Uint8Array(bytes.byteLength)
  view.set(bytes)
  return toHex(await crypto.subtle.digest(algorithm, view))
}

/** Which algorithm, if any, produced `expected` (case and spacing ignored). */
export function matchHash(expected: string, hashes: Partial<Record<HashAlgorithm, string>>): HashAlgorithm | null {
  const clean = expected.trim().toLowerCase().replace(/[\s:-]/g, '')
  if (!clean) return null
  for (const algorithm of HASH_ALGORITHMS) if (hashes[algorithm] === clean) return algorithm
  return null
}

export interface HexRow {
  offset: number
  hex: string[]
  ascii: string
}

export function hexRows(bytes: Uint8Array, start = 0, length = 512): HexRow[] {
  const rows: HexRow[] = []
  const end = Math.min(bytes.length, start + length)
  for (let offset = start; offset < end; offset += 16) {
    const slice = bytes.subarray(offset, Math.min(end, offset + 16))
    rows.push({
      offset,
      hex: [...slice].map((byte) => byte.toString(16).padStart(2, '0')),
      ascii: [...slice].map((byte) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '·')).join(''),
    })
  }
  return rows
}

export interface ByteProfile {
  /** Shannon entropy in bits per byte, 0 to 8. */
  entropy: number
  histogram: Uint32Array
  sampled: boolean
}

const PROFILE_SAMPLE = 8 * 1024 * 1024

export function byteProfile(bytes: Uint8Array): ByteProfile {
  const histogram = new Uint32Array(256)
  const sampled = bytes.length > PROFILE_SAMPLE
  const step = sampled ? Math.ceil(bytes.length / PROFILE_SAMPLE) : 1
  let total = 0
  for (let index = 0; index < bytes.length; index += step) {
    histogram[bytes[index]] += 1
    total += 1
  }
  let entropy = 0
  for (const count of histogram) {
    if (!count) continue
    const p = count / total
    entropy -= p * Math.log2(p)
  }
  return { entropy, histogram, sampled }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export interface DecodedBase64 {
  bytes: Uint8Array
  mime: string | null
}

/** Accepts plain, URL-safe or data-URL Base64 with any whitespace. */
export function base64ToBytes(input: string): DecodedBase64 {
  let text = input.trim()
  let mime: string | null = null
  const dataUrl = /^data:([^;,]*)(?:;[^,]*)?;base64,/i.exec(text)
  if (dataUrl) {
    mime = dataUrl[1] || null
    text = text.slice(dataUrl[0].length)
  }
  text = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length === 0) throw new Error('This is not valid Base64.')
  const padded = text.padEnd(Math.ceil(text.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return { bytes, mime }
}
