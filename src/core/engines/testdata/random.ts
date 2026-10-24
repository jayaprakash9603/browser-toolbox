export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number
  float(min: number, max: number, decimals?: number): number
  pick<T>(items: readonly T[]): T
  bool(probability?: number): boolean
  chars(alphabet: string, length: number): string
  hex(length: number): string
}

const SEED_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Mulberry32: tiny, fast and good enough for fake data; the same seed always yields the same stream. */
export function createRng(seed: string | number): Rng {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  return {
    next,
    int,
    float: (min, max, decimals = 2) => Number((min + next() * (max - min)).toFixed(decimals)),
    pick: (items) => items[Math.floor(next() * items.length)],
    bool: (probability = 0.5) => next() < probability,
    chars: (alphabet, length) =>
      Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]).join(''),
    hex: (length) =>
      Array.from({ length }, () => Math.floor(next() * 16).toString(16)).join(''),
  }
}

export function randomSeed(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => SEED_ALPHABET[byte % SEED_ALPHABET.length]).join('')
}
