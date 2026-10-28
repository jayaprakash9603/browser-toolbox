import { STATUS_META } from './constants'
import type { NetDateFormat, NetLogOptions, NetStatus } from './types'

/** h:mm:ss, matching how ICM shows durations. */
export function formatClockDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDuration(ms: number, format: NetLogOptions['durationFormat'] = 'human'): string {
  return format === 'seconds' ? String(Math.max(0, Math.round(ms / 1000))) : formatClockDuration(ms)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatDateTime(ts: number, format: NetDateFormat = 'default'): string {
  const d = new Date(ts)
  switch (format) {
    case 'us':
      return d.toLocaleString('en-US')
    case 'eu':
      return d.toLocaleString('en-GB')
    case 'iso':
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    default:
      return d.toLocaleString()
  }
}

export function formatStatus(status: NetStatus, format: NetLogOptions['statusFormat'] = 'human'): string {
  return STATUS_META[status][format]
}

export function formatAvailability(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(2)}%`
}

export function formatLatency(ms: number | null): string {
  return ms === null ? '—' : `${Math.round(ms)} ms`
}

export function formatPercent(value: number | null, digits = 1): string {
  return value === null ? '—' : `${(value * 100).toFixed(digits)}%`
}
