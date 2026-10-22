/**
 * Per-site cosmetic filters are split across SHARD_COUNT files so a page only downloads the
 * few kilobytes that apply to its hostname, and generic selectors keyed by id/class are split
 * across GENERIC_SHARD_COUNT files. Keep in sync with scripts/adblock/converter/shard.mjs
 * (a unit test asserts both agree).
 */
export const SHARD_COUNT = 256
export const GENERIC_SHARD_COUNT = 256

export function hashShard(value: string, count: number): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (((hash << 5) + hash + value.charCodeAt(i)) >>> 0) | 0
    hash >>>= 0
  }
  return hash % count
}

export function hostShard(host: string): number {
  return hashShard(host, SHARD_COUNT)
}

/** The host and its parent domains, plus uBO entity forms (`google.*`, `google.co.*`). */
export function hostCandidates(host: string): string[] {
  const parts = host.split('.')
  const out: string[] = []
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'))
  for (let i = 0; i < parts.length - 1; i++) {
    for (let j = i + 1; j < parts.length; j++) out.push(`${parts.slice(i, j).join('.')}.*`)
  }
  return out
}

/** `key` is `#id` or `.class`, exactly as it appears on the element (unescaped). */
export function genericKeyShard(key: string): number {
  return hashShard(key, GENERIC_SHARD_COUNT)
}
