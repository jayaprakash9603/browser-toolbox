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

export function bloomHas(filter: BloomFilter, key: string): boolean {
  const h1 = djb2(key)
  const h2 = fnv1a(key) | 1
  for (let i = 0; i < filter.k; i++) {
    const bit = ((h1 + Math.imul(i, h2)) >>> 0) % filter.m
    if (!(filter.bits[bit >>> 3] & (1 << (bit & 7)))) return false
  }
  return true
}
