import { Crc32 } from './crc32'
import { Md5 } from './md5'
import { detectSignature, SIGNATURE_PROBE_BYTES, type FileSignature } from './signature'

export type DigestAlgorithm = 'SHA-256' | 'SHA-512' | 'SHA-384' | 'SHA-1' | 'MD5' | 'CRC32'

export interface DigestAlgorithmInfo {
  id: DigestAlgorithm
  /** Hex digest length, used to recognise a pasted hash. */
  hexLength: number
  strength: 'strong' | 'legacy' | 'checksum'
}

export const DIGEST_ALGORITHMS: readonly DigestAlgorithmInfo[] = [
  { id: 'SHA-256', hexLength: 64, strength: 'strong' },
  { id: 'SHA-512', hexLength: 128, strength: 'strong' },
  { id: 'SHA-384', hexLength: 96, strength: 'strong' },
  { id: 'SHA-1', hexLength: 40, strength: 'legacy' },
  { id: 'MD5', hexLength: 32, strength: 'legacy' },
  { id: 'CRC32', hexLength: 8, strength: 'checksum' },
]

export const ALL_DIGESTS = DIGEST_ALGORITHMS.map((a) => a.id)

export type Digests = Partial<Record<DigestAlgorithm, string>>

/**
 * Web Crypto needs the whole input in one buffer; past this size SHA digests are skipped and only the
 * streaming MD5 and CRC-32 are computed, so a huge evidence file never exhausts the tab's memory.
 */
export const MAX_SHA_BYTES = 2 * 1024 ** 3

const SHA = new Set<DigestAlgorithm>(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'])
const CHUNK_BYTES = 4 * 1024 * 1024

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function subtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle)
    throw new Error('Web Crypto is not available here.')
  return crypto.subtle
}

/** Digests of bytes already in memory (typed text, decoded hex or Base64). */
export async function digestBytes(
  bytes: Uint8Array,
  algorithms: readonly DigestAlgorithm[] = ALL_DIGESTS,
): Promise<Digests> {
  const out: Digests = {}
  for (const algorithm of algorithms) {
    if (algorithm === 'MD5') out.MD5 = new Md5().update(bytes).digest()
    else if (algorithm === 'CRC32') out.CRC32 = new Crc32().update(bytes).digest()
    else out[algorithm] = toHex(await subtle().digest(algorithm, bytes as Uint8Array<ArrayBuffer>))
  }
  return out
}

export interface BlobDigest {
  digests: Digests
  /** Algorithms that could not be computed, with the reason. */
  skipped: Partial<Record<DigestAlgorithm, string>>
  /** Shannon entropy in bits per byte, 0 (uniform) to 8 (random, compressed or encrypted). */
  entropy: number
  signature: FileSignature | null
  head: Uint8Array
  durationMs: number
}

export interface DigestOptions {
  algorithms?: readonly DigestAlgorithm[]
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

function abortError(): DOMException {
  return new DOMException('Hashing was cancelled.', 'AbortError')
}

/** Reads a file once in chunks, feeding streaming digests, the byte histogram and the signature probe. */
export async function digestBlob(blob: Blob, options: DigestOptions = {}): Promise<BlobDigest> {
  const { algorithms = ALL_DIGESTS, onProgress, signal } = options
  const started = performance.now()
  const size = blob.size
  const wantsSha = algorithms.some((a) => SHA.has(a))
  const full = wantsSha && size <= MAX_SHA_BYTES ? new Uint8Array(size) : null
  const md5 = algorithms.includes('MD5') ? new Md5() : null
  const crc = algorithms.includes('CRC32') ? new Crc32() : null
  const histogram = new Float64Array(256)
  const head = new Uint8Array(Math.min(size, SIGNATURE_PROBE_BYTES))

  for (let offset = 0; offset < size; offset += CHUNK_BYTES) {
    if (signal?.aborted) throw abortError()
    const chunk = new Uint8Array(await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer())
    md5?.update(chunk)
    crc?.update(chunk)
    full?.set(chunk, offset)
    if (offset < head.length) head.set(chunk.subarray(0, head.length - offset), offset)
    for (let i = 0; i < chunk.length; i += 1) histogram[chunk[i]] += 1
    onProgress?.(Math.min(1, (offset + chunk.length) / size) * (full ? 0.92 : 1))
  }
  if (signal?.aborted) throw abortError()

  const digests: Digests = {}
  const skipped: BlobDigest['skipped'] = {}
  for (const algorithm of algorithms) {
    if (algorithm === 'MD5' && md5) digests.MD5 = md5.digest()
    else if (algorithm === 'CRC32' && crc) digests.CRC32 = crc.digest()
    else if (SHA.has(algorithm)) {
      if (!full) skipped[algorithm] = 'too-large'
      else digests[algorithm] = toHex(await subtle().digest(algorithm, full))
    }
  }
  onProgress?.(1)

  let entropy = 0
  if (size > 0) {
    for (const count of histogram) {
      if (count === 0) continue
      const p = count / size
      entropy -= p * Math.log2(p)
    }
  }
  return {
    digests,
    skipped,
    entropy,
    signature: size > 0 ? detectSignature(head) : null,
    head: head.subarray(0, 64),
    durationMs: performance.now() - started,
  }
}

export type DigestFormat = 'hex' | 'HEX' | 'base64'

export function formatDigest(hex: string, format: DigestFormat): string {
  if (format === 'HEX') return hex.toUpperCase()
  if (format === 'hex') return hex
  const pairs = hex.match(/../g) ?? []
  return btoa(String.fromCharCode(...pairs.map((pair) => parseInt(pair, 16))))
}

export type InputEncoding = 'utf8' | 'hex' | 'base64'

export type DecodedInput = { ok: true; bytes: Uint8Array } | { ok: false; error: 'hex' | 'base64' }

export function decodeInput(text: string, encoding: InputEncoding): DecodedInput {
  if (encoding === 'utf8') return { ok: true, bytes: new TextEncoder().encode(text) }
  if (encoding === 'hex') {
    const clean = text.replace(/0x/gi, '').replace(/[\s:,-]/g, '')
    if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) return { ok: false, error: 'hex' }
    return {
      ok: true,
      bytes: Uint8Array.from(clean.match(/../g) ?? [], (pair) => parseInt(pair, 16)),
    }
  }
  try {
    const clean = text.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '='))
    return { ok: true, bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)) }
  } catch {
    return { ok: false, error: 'base64' }
  }
}

export interface ExpectedDigest {
  hex: string
  /** Algorithms whose digest length fits; a tag such as "sha256=" narrows it to one. */
  candidates: DigestAlgorithm[]
}

const TAGS: Record<string, DigestAlgorithm> = {
  sha256: 'SHA-256',
  sha512: 'SHA-512',
  sha384: 'SHA-384',
  sha1: 'SHA-1',
  md5: 'MD5',
  crc32: 'CRC32',
}

/**
 * Normalises a pasted reference hash: hex with any spacing, colons or "0x", Base64, or a tagged
 * value such as GitHub's "sha256=…" signature header or "SHA256: …".
 */
export function parseExpected(input: string): ExpectedDigest | null {
  let text = input.trim()
  if (!text) return null
  let tagged: DigestAlgorithm | undefined
  const tag = /^([a-z0-9-]+)\s*[:=]\s*/i.exec(text)
  if (tag) {
    tagged = TAGS[tag[1].toLowerCase().replace(/-/g, '')]
    if (tagged) text = text.slice(tag[0].length)
  }
  const hexCandidate = text.replace(/^0x/i, '').replace(/[\s:-]/g, '')
  let hex: string | null = /^[0-9a-f]+$/i.test(hexCandidate) ? hexCandidate.toLowerCase() : null
  if (!hex && /^[A-Za-z0-9+/_-]+=*$/.test(text.replace(/\s/g, ''))) {
    const decoded = decodeInput(text, 'base64')
    if (decoded.ok) hex = [...decoded.bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  if (!hex) return null
  const byLength = DIGEST_ALGORITHMS.filter((a) => a.hexLength === hex.length).map((a) => a.id)
  const candidates = tagged ? byLength.filter((a) => a === tagged) : byLength
  return candidates.length > 0 ? { hex, candidates } : null
}

export type ExpectedVerdict =
  | { state: 'match'; algorithm: DigestAlgorithm }
  | { state: 'mismatch'; algorithms: DigestAlgorithm[] }
  | { state: 'invalid' }

export function compareExpected(
  expected: ExpectedDigest | null,
  digests: Digests,
): ExpectedVerdict {
  if (!expected) return { state: 'invalid' }
  const algorithm = expected.candidates.find((a) => digests[a] === expected.hex)
  return algorithm
    ? { state: 'match', algorithm }
    : { state: 'mismatch', algorithms: expected.candidates }
}
