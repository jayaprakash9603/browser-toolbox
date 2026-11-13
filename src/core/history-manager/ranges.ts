import type { HistoryRangePreset } from './types'

export function rangeBounds(preset: HistoryRangePreset, now = Date.now()): { startTime: number; endTime: number } {
  const endTime = now
  const day = 86_400_000
  switch (preset) {
    case 'today': {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      return { startTime: d.getTime(), endTime }
    }
    case '7d':
      return { startTime: endTime - 7 * day, endTime }
    case '30d':
      return { startTime: endTime - 30 * day, endTime }
    case '90d':
      return { startTime: endTime - 90 * day, endTime }
    case 'all':
      return { startTime: 0, endTime }
    default:
      return { startTime: endTime - 7 * day, endTime }
  }
}

export function customRangeBounds(start?: number, end?: number, now = Date.now()): { startTime: number; endTime: number } {
  return {
    startTime: start ?? 0,
    endTime: end ?? now,
  }
}
