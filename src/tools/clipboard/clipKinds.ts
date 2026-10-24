import type { ClipboardEntry } from '@/core/clipboard'

export type ClipKind = 'link' | 'email' | 'color' | 'code' | 'number' | 'text'
export type ClipFilter = 'all' | 'pinned' | 'link' | 'code' | 'text'
export type DateGroup = 'today' | 'yesterday' | 'earlier'

const COLOR =
  /^(#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|hsl)a?\([^)]{3,40}\)|oklch\([^)]{3,40}\))$/i
const LINK = /^(?:https?:\/\/|www\.)\S+$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
const NUMBER = /^[\d\s.,:+\-()%/]+$/
const CODE_SIGNAL =
  /[{};]\s*$|=>|^\s*(?:const|let|var|function|import|export|return|def|class|if|for|SELECT|<\/?[a-z][\w-]*[\s>])/im

export function classifyClip(text: string): ClipKind {
  const value = text.trim()
  if (!value) return 'text'
  if (COLOR.test(value)) return 'color'
  if (LINK.test(value)) return 'link'
  if (EMAIL.test(value)) return 'email'
  if (NUMBER.test(value) && /\d/.test(value)) return 'number'
  if ((value.startsWith('{') || value.startsWith('[')) && isJson(value)) return 'code'
  if (CODE_SIGNAL.test(value) && (value.includes('\n') || /[{}();=<>]/.test(value))) return 'code'
  return 'text'
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function matchesFilter(entry: ClipboardEntry, kind: ClipKind, filter: ClipFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'pinned':
      return entry.pinned
    case 'link':
      return kind === 'link' || kind === 'email'
    case 'code':
      return kind === 'code' || kind === 'color'
    case 'text':
      return kind === 'text' || kind === 'number'
  }
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function dateGroup(timestamp: number, now = Date.now()): DateGroup {
  const today = startOfDay(now)
  if (timestamp >= today) return 'today'
  if (timestamp >= today - 86_400_000) return 'yesterday'
  return 'earlier'
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

export function relativeTime(timestamp: number, now = Date.now(), locale?: string): string {
  const diff = timestamp - now
  if (Math.abs(diff) < 45_000)
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second')
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      if (unit === 'day' && Math.abs(diff) >= 7 * ms) {
        return new Date(timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
      }
      return format.format(Math.round(diff / ms), unit)
    }
  }
  return ''
}
