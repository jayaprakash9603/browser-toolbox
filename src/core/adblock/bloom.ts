/**
 * Bloom filter over the generic cosmetic keys (`#id` / `.class`), so a page only fetches the
 * selector shards for keys that really have filters. Binary layout: uint32 LE bit count,
 * uint32 LE hash count, then the bit array. Keep in sync with scripts/adblock/converter/bloom.mjs.
 */
export function djb2(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (((hash << 5) + hash + value.charCodeAt(i)) >>> 0) | 0
    hash >>>= 0
  }
  return hash
}

export function fnv1a(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export interface BloomFilter {
  bits: Uint8Array
  m: number
  k: number
}

export function parseBloom(buffer: ArrayBuffer): BloomFilter | null {
  if (buffer.byteLength < 8) return null
  const view = new DataView(buffer)
  const m = view.getUint32(0, true)
  const k = view.getUint32(4, true)
  if (!m || !k || buffer.byteLength < 8 + Math.ceil(m / 8)) return null
  return { bits: new Uint8Array(buffer, 8), m, k }
}

function testBits(m: number, k: number, key: string, byteAt: (index: number) => number): boolean {
  const h1 = djb2(key)
  const h2 = fnv1a(key) | 1
  for (let i = 0; i < k; i++) {
    const bit = ((h1 + Math.imul(i, h2)) >>> 0) % m
    if (!(byteAt(bit >>> 3) & (1 << (bit & 7)))) return false
  }
  return true
}

export function bloomHas(filter: BloomFilter, key: string): boolean {
  return testBits(filter.m, filter.k, key, (index) => filter.bits[index])
}

/** The same filter with its bit array as base64 text, so a page script can embed it inline. */
export interface Base64Bloom {
  m: number
  k: number
  bits: string
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
let base64Values: Int8Array | null = null

function base64Value(code: number): number {
  if (!base64Values) {
    base64Values = new Int8Array(128)
    for (let i = 0; i < BASE64.length; i++) base64Values[BASE64.charCodeAt(i)] = i
  }
  return code < 128 ? base64Values[code] : 0
}

/** Reads single bytes straight out of the base64 text, without decoding the whole filter. */
export function bloomHasBase64(filter: Base64Bloom, key: string): boolean {
  const { bits } = filter
  return testBits(filter.m, filter.k, key, (index) => {
    const offset = ((index / 3) | 0) * 4
    const group =
      (base64Value(bits.charCodeAt(offset)) << 18) |
      (base64Value(bits.charCodeAt(offset + 1)) << 12) |
      (base64Value(bits.charCodeAt(offset + 2)) << 6) |
      base64Value(bits.charCodeAt(offset + 3))
    return (group >> (16 - 8 * (index % 3))) & 0xff
  })
}
