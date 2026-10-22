/** Scroll offsets for full-page capture with optional overlap to reduce seam gaps. */
export function fullPageScrollOffsets(
  totalHeight: number,
  viewportHeight: number,
  overlapPx = 0,
): number[] {
  if (viewportHeight <= 0) return [0]
  const step = Math.max(1, viewportHeight - overlapPx)
  if (totalHeight <= viewportHeight) return [0]
  const offsets: number[] = []
  let y = 0
  while (y + viewportHeight < totalHeight) {
    offsets.push(y)
    y += step
  }
  offsets.push(Math.max(0, totalHeight - viewportHeight))
  return offsets
}

export const CAPTURE_THROTTLE_MS = 550

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function throttleCaptures<T>(
  tasks: (() => Promise<T>)[],
  minGapMs: number,
): Promise<T[]> {
  const results: T[] = []
  let lastAt = 0
  for (const task of tasks) {
    const wait = Math.max(0, minGapMs - (Date.now() - lastAt))
    if (wait > 0) await sleep(wait)
    results.push(await task())
    lastAt = Date.now()
  }
  return results
}

/** Split canvas height into tiles under browser max dimension. */
export function tileHeights(totalHeight: number, maxTile = 16384): number[] {
  if (totalHeight <= maxTile) return [totalHeight]
  const heights: number[] = []
  let remaining = totalHeight
  while (remaining > 0) {
    const h = Math.min(maxTile, remaining)
    heights.push(h)
    remaining -= h
  }
  return heights
}
