/**
 * Per-site cosmetic filters are split across SHARD_COUNT files so a page only downloads the
 * few kilobytes that apply to its hostname, and generic selectors keyed by id/class are split
 * across GENERIC_SHARD_COUNT files. Keep in sync with src/core/adblock/shard.ts
 * (a unit test asserts both produce the same shard).
 */
export const SHARD_COUNT = 256
export const GENERIC_SHARD_COUNT = 256

export function hashShard(value, count) {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (((hash << 5) + hash + value.charCodeAt(i)) >>> 0) | 0
    hash >>>= 0
  }
  return hash % count
}

export function hostShard(host) {
  return hashShard(host, SHARD_COUNT)
}

export function genericKeyShard(key) {
  return hashShard(key, GENERIC_SHARD_COUNT)
}
