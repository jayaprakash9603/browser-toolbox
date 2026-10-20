import type { ThroughputPoint } from './types'

export function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Mean absolute difference between consecutive round trips (RFC 3550 style, unsmoothed). */
export function jitter(values: number[]): number | null {
  if (values.length < 2) return null
  let sum = 0
  for (let i = 1; i < values.length; i++) sum += Math.abs(values[i] - values[i - 1])
  return sum / (values.length - 1)
}

/** Reads Cloudflare's `server-timing: cfRequestDuration;dur=12.3` so server work isn't counted as ping. */
export function serverTimingMs(header: string | null): number {
  if (!header) return 0
  const match = /dur=([\d.]+)/.exec(header)
  return match ? Number(match[1]) || 0 : 0
}

export function toMbps(bytes: number, ms: number): number {
  return ms > 0 ? (bytes * 8) / (ms / 1000) / 1_000_000 : 0
}

/** Speed over the trailing window, used for the live needle. */
export function windowMbps(points: ThroughputPoint[], windowMs = 1000): number {
  const last = points.at(-1)
  if (!last || points.length < 2) return 0
  let base = points[0]
  for (let i = points.length - 2; i >= 0; i--) {
    base = points[i]
    if (last.t - points[i].t >= windowMs) break
  }
  return toMbps(last.bytes - base.bytes, last.t - base.t)
}

/** Average after TCP ramp-up so slow start doesn't drag the result down. */
export function finalMbps(points: ThroughputPoint[], warmupMs: number): number | null {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last || last.bytes === 0 || last.t === first.t) return null
  const start = points.find((p) => p.t - first.t >= warmupMs && p.t < last.t) ?? first
  return toMbps(last.bytes - start.bytes, last.t - start.t)
}

export const GAUGE_TICKS = [0, 1, 5, 10, 50, 100, 250, 500, 1000] as const

/** Piecewise scale with evenly spaced ticks, like classic speed test dials. */
export function gaugeFraction(mbps: number): number {
  if (!(mbps > 0)) return 0
  const ticks = GAUGE_TICKS
  if (mbps >= ticks.at(-1)!) return 1
  const step = 1 / (ticks.length - 1)
  for (let i = 1; i < ticks.length; i++) {
    if (mbps <= ticks[i]) return (i - 1 + (mbps - ticks[i - 1]) / (ticks[i] - ticks[i - 1])) * step
  }
  return 1
}

export function formatMbps(mbps: number | null): string {
  if (mbps === null) return '—'
  if (mbps >= 100) return mbps.toFixed(0)
  if (mbps >= 10) return mbps.toFixed(1)
  return mbps.toFixed(2)
}

/** Rough rating so the result reads as something the user can act on. */
export function speedRating(downloadMbps: number | null): 'slow' | 'ok' | 'good' | 'great' | null {
  if (downloadMbps === null) return null
  if (downloadMbps < 5) return 'slow'
  if (downloadMbps < 25) return 'ok'
  if (downloadMbps < 100) return 'good'
  return 'great'
}
