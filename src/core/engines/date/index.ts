const MS_PER_SECOND = 1000
const MS_PER_DAY = 86_400_000

export type DateResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface TimestampDetection {
  kind: 'seconds' | 'milliseconds'
  date: Date
}

export function parseTimestamp(input: string): DateResult<TimestampDetection> {
  const trimmed = input.trim()
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, error: 'Timestamp must be a whole number.' }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value))
    return { ok: false, error: 'Number is too large to convert safely.' }
  const kind = Math.abs(value) >= 1e12 ? 'milliseconds' : 'seconds'
  const ms = kind === 'seconds' ? value * MS_PER_SECOND : value
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return { ok: false, error: 'Timestamp is out of range.' }
  return { ok: true, value: { kind, date } }
}

export function dateToTimestamp(date: Date, unit: 'seconds' | 'milliseconds'): number {
  const ms = date.getTime()
  return unit === 'seconds' ? Math.floor(ms / MS_PER_SECOND) : ms
}

export function nowTimestamp(unit: 'seconds' | 'milliseconds'): number {
  return dateToTimestamp(new Date(), unit)
}

const RELATIVE_STEPS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: 'second' },
  { limit: 3_600, divisor: 60, unit: 'minute' },
  { limit: 86_400, divisor: 3_600, unit: 'hour' },
  { limit: 604_800, divisor: 86_400, unit: 'day' },
  { limit: 2_592_000, divisor: 604_800, unit: 'week' },
  { limit: 31_536_000, divisor: 2_592_000, unit: 'month' },
  { limit: Infinity, divisor: 31_536_000, unit: 'year' },
]

export function relativeTime(from: Date, to: Date = new Date()): string {
  const diffSeconds = Math.round((from.getTime() - to.getTime()) / MS_PER_SECOND)
  const abs = Math.abs(diffSeconds)
  const step =
    RELATIVE_STEPS.find((candidate) => abs < candidate.limit) ??
    RELATIVE_STEPS[RELATIVE_STEPS.length - 1]
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return formatter.format(Math.trunc(diffSeconds / step.divisor), step.unit)
}

export interface DateDifference {
  totalDays: number
  weeks: number
  days: number
  hours: number
  minutes: number
}

export function diffDates(a: Date, b: Date): DateDifference {
  const diffMs = Math.abs(b.getTime() - a.getTime())
  const totalDays = Math.floor(diffMs / MS_PER_DAY)
  return {
    totalDays,
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    hours: Math.floor((diffMs % MS_PER_DAY) / 3_600_000),
    minutes: Math.floor((diffMs % 3_600_000) / 60_000),
  }
}

function utcDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + Math.trunc(amount))
  return next
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function workingDaysBetween(a: Date, b: Date): number {
  const start = Math.min(utcDay(a), utcDay(b))
  const end = Math.max(utcDay(a), utcDay(b))
  let count = 0
  for (let day = start; day <= end; day += MS_PER_DAY) {
    if (!isWeekend(new Date(day))) count += 1
  }
  return count
}

export function convertTimeZone(date: Date, timeZone: string): DateResult<string> {
  try {
    return {
      ok: true,
      value: new Intl.DateTimeFormat('en-GB', {
        timeZone,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(date),
    }
  } catch {
    return { ok: false, error: `Unknown timezone "${timeZone}".` }
  }
}

export interface CronField {
  name: string
  raw: string
  values: number[] | 'any'
  min: number
  max: number
}

export type CronResult =
  { ok: true; fields: CronField[]; description: string } | { ok: false; error: string }

const CRON_FIELDS: { name: string; min: number; max: number }[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of week', min: 0, max: 7 },
]

const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function normalizeCronToken(token: string, fieldName: string): string {
  const lower = token.toLowerCase()
  if (fieldName === 'month') {
    const index = MONTH_NAMES.indexOf(lower)
    if (index >= 0) return String(index + 1)
  }
  if (fieldName === 'day of week') {
    const index = DAY_NAMES.indexOf(lower)
    if (index >= 0) return String(index)
  }
  return token
}

function parseCronField(raw: string, name: string, min: number, max: number): CronField | string {
  if (raw === '*' || raw === '?') return { name, raw, values: 'any', min, max }
  const values = new Set<number>()
  for (const part of raw.split(',')) {
    const match = /^([^/]+)(?:\/(\d+))?$/.exec(part)
    if (!match) return `Invalid ${name} segment "${part}".`
    const rangePart = match[1]
    const step = match[2] ? Number(match[2]) : 1
    if (step < 1) return `Step in ${name} must be at least 1.`
    let start: number
    let end: number
    if (rangePart === '*') {
      start = min
      end = max
    } else {
      const bounds = rangePart.split('-').map((token) => Number(normalizeCronToken(token, name)))
      if (bounds.some((bound) => Number.isNaN(bound)))
        return `Invalid ${name} value "${rangePart}".`
      start = bounds[0]
      end = bounds.length === 2 ? bounds[1] : match[2] ? max : bounds[0]
    }
    if (start < min || end > max || start > end)
      return `${name} value out of range (${min}–${max}).`
    for (let value = start; value <= end; value += step) values.add(value)
  }
  return { name, raw, values: [...values].sort((a, b) => a - b), min, max }
}

function describeCronField(field: CronField): string {
  if (field.values === 'any') return `every ${field.name}`
  if (field.values.length > 6) {
    const first = field.values[0]
    const second = field.values[1]
    const last = field.values[field.values.length - 1]
    if (
      field.values.every(
        (value, index) =>
          index === 0 || value === (field.values as number[])[index - 1] + (second - first),
      )
    ) {
      return `every ${second - first} ${field.name}s from ${first} to ${last}`
    }
    return `${field.values.length} ${field.name} values`
  }
  return `${field.name} ${field.values.join(', ')}`
}

export function parseCron(expression: string): CronResult {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return {
      ok: false,
      error:
        'A cron expression needs exactly 5 fields: minute hour day-of-month month day-of-week.',
    }
  }
  const fields: CronField[] = []
  for (let index = 0; index < 5; index += 1) {
    const meta = CRON_FIELDS[index]
    const parsed = parseCronField(parts[index], meta.name, meta.min, meta.max)
    if (typeof parsed === 'string') return { ok: false, error: parsed }
    fields.push(parsed)
  }
  const [minute, hour, dom, month, dow] = fields
  const time =
    minute.values !== 'any' &&
    hour.values !== 'any' &&
    minute.values.length === 1 &&
    hour.values.length === 1
      ? `At ${String(hour.values[0]).padStart(2, '0')}:${String(minute.values[0]).padStart(2, '0')}`
      : `Runs at ${describeCronField(minute)}, ${describeCronField(hour)}`
  const dayParts: string[] = []
  if (dom.values !== 'any')
    dayParts.push(
      `on day-of-month ${dom.values.length <= 6 ? dom.values.join(', ') : describeCronField(dom)}`,
    )
  if (month.values !== 'any') dayParts.push(`in ${describeCronField(month)}`)
  if (dow.values !== 'any') {
    const normalized = dow.values.map((value) => value % 7)
    const unique = [...new Set(normalized)]
    const names = unique.map((value) => DAY_NAMES[value])
    dayParts.push(`on ${names.length <= 6 ? names.join(', ') : describeCronField(dow)}`)
  }
  return {
    ok: true,
    fields,
    description: dayParts.length ? `${time}, ${dayParts.join(', ')}.` : `${time}, every day.`,
  }
}

export function looksLikeTimestamp(input: string): boolean {
  const trimmed = input.trim()
  if (!/^\d{9,13}$/.test(trimmed)) return false
  return parseTimestamp(trimmed).ok
}
