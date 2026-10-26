export const EASE = [0.22, 1, 0.36, 1] as const

/** `initial` for a beat: animate from `value` while playing, otherwise render the finished frame. */
export function from<T>(play: boolean, value: T): T | false {
  return play ? value : false
}

export function seedOf(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}

/** Deterministic 0..1 value for the n-th pick of a seed. */
export function pick(seed: number, n: number) {
  const x = Math.sin(seed * 0.001 + n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export const at = (delay: number, duration = 0.4) => ({ duration, delay, ease: EASE })
