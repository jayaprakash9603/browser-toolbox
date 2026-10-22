/** Keep in sync with src/core/adblock/bloom.ts (a unit test asserts both agree). */
export function djb2(value) {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (((hash << 5) + hash + value.charCodeAt(i)) >>> 0) | 0
    hash >>>= 0
  }
  return hash
}

export function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Builds the binary filter for `keys` at roughly `falsePositiveRate`. */
export function buildBloom(keys, falsePositiveRate = 0.01) {
  const n = Math.max(1, keys.length)
  const m = Math.ceil((-n * Math.log(falsePositiveRate)) / Math.LN2 ** 2)
  const k = Math.max(1, Math.round((m / n) * Math.LN2))
  const buffer = new Uint8Array(8 + Math.ceil(m / 8))
  const view = new DataView(buffer.buffer)
  view.setUint32(0, m, true)
  view.setUint32(4, k, true)
  const bits = buffer.subarray(8)
  for (const key of keys) {
    const h1 = djb2(key)
    const h2 = fnv1a(key) | 1
    for (let i = 0; i < k; i++) {
      const bit = ((h1 + Math.imul(i, h2)) >>> 0) % m
      bits[bit >>> 3] |= 1 << (bit & 7)
    }
  }
  return buffer
}
