/**
 * Per-site cosmetic filters are split across SHARD_COUNT files so a page only downloads the
 * few kilobytes that apply to its hostname. Keep in sync with
 * scripts/adblock/converter/shard.mjs (a unit test asserts both agree).
 */
export const SHARD_COUNT = 64

export function hostShard(host: string): number {
  let hash = 5381
  for (let i = 0; i < host.length; i++) {
    hash = (((hash << 5) + hash + host.charCodeAt(i)) >>> 0) | 0
    hash >>>= 0
  }
  return hash % SHARD_COUNT
}
