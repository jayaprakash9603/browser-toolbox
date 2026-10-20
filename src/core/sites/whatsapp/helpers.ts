import { BROADCAST_DELAY_MIN_SEC } from './constants'
import type { WhatsappPlusState } from './types'

export function featureAttrName(id: string): string {
  const kebab = id.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `data-tbx-wa-${kebab}`
}

export function isFeatureOn(values: Record<string, unknown>, id: string): boolean {
  return values[id] === true
}

export function countActiveFeatures(state: WhatsappPlusState): number {
  if (!state.enabled) return 0
  let n = 0
  for (const [id, v] of Object.entries(state.values)) {
    if (v === true) n++
    if (typeof v === 'string' && v.trim() && !id.endsWith('ApiKey')) n++
  }
  return n
}

/** Replace `{name}`, `{date}`, `{time}` in template bodies */
export function applyTemplateVariables(
  body: string,
  vars: { name?: string; date?: string; time?: string },
): string {
  const now = new Date()
  const date = vars.date ?? now.toLocaleDateString()
  const time = vars.time ?? now.toLocaleTimeString()
  const name = vars.name ?? ''
  return body
    .replace(/\{name\}/gi, name)
    .replace(/\{date\}/gi, date)
    .replace(/\{time\}/gi, time)
}

/** Simple spintax: `{a|b|c}` picks one option */
export function spinText(input: string): string {
  return input.replace(/\{([^{}|]+(?:\|[^{}|]+)+)\}/g, (_, group: string) => {
    const parts = group.split('|')
    return parts[Math.floor(Math.random() * parts.length)] ?? ''
  })
}

export function matchesSmartReply(
  text: string,
  pattern: string,
  isRegex: boolean,
): boolean {
  const hay = text.trim()
  if (!hay) return false
  if (isRegex) {
    try {
      return new RegExp(pattern, 'i').test(hay)
    } catch {
      return false
    }
  }
  return hay.toLowerCase().includes(pattern.trim().toLowerCase())
}

export function isWithinWorkingHours(start: string, end: string, now = new Date()): boolean {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = now.getHours() * 60 + now.getMinutes()
  const startM = sh * 60 + (sm || 0)
  const endM = eh * 60 + (em || 0)
  if (startM <= endM) return mins >= startM && mins <= endM
  return mins >= startM || mins <= endM
}

export function randomDelayMs(minSec: number, maxSec: number): number {
  const lo = Math.max(BROADCAST_DELAY_MIN_SEC, minSec)
  const hi = Math.max(lo, maxSec)
  const sec = lo + Math.random() * (hi - lo)
  return Math.round(sec * 1000)
}

export function contactsToCsv(rows: Record<string, string>[]): string {
  if (!rows.length) return ''
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [keys.join(',')]
  for (const row of rows) {
    lines.push(keys.map((k) => esc(row[k] ?? '')).join(','))
  }
  return lines.join('\n')
}
