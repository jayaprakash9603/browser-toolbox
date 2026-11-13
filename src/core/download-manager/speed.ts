import type { DownloadSpeedSample } from './types'

const MIN_DELTA_MS = 400

export function computeSpeedBps(samples: DownloadSpeedSample[]): number {
  if (samples.length < 2) return 0
  const latest = samples[samples.length - 1]
  const prev = samples[samples.length - 2]
  const deltaBytes = latest.bytes - prev.bytes
  const deltaMs = latest.at - prev.at
  if (deltaMs < MIN_DELTA_MS || deltaBytes <= 0) return 0
  return Math.round((deltaBytes * 1000) / deltaMs)
}

export function etaMs(bytesReceived: number, totalBytes: number | undefined, bps: number): number | null {
  if (!totalBytes || totalBytes <= bytesReceived || bps <= 0) return null
  const remaining = totalBytes - bytesReceived
  return Math.round((remaining * 1000) / bps)
}

export function pushSpeedSample(
  samples: DownloadSpeedSample[],
  bytesReceived: number,
  at = Date.now(),
  max = 24,
): DownloadSpeedSample[] {
  const next = [...samples, { bytes: bytesReceived, at }]
  return next.length > max ? next.slice(next.length - max) : next
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

export function formatSpeed(bps: number): string {
  if (bps <= 0) return '—'
  return `${formatBytes(bps)}/s`
}

export function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${s}s`
}
