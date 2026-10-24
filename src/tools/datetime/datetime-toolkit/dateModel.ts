import { isWeekend, relativeTime, type CronField } from '@/core/engines/date'
import { COMMON_TIMEZONES, isValidTimeZone, timeZoneOffsetMinutes } from '@/core/engines/timezone'

const MS_PER_DAY = 86_400_000
const MAX_STEP_DAYS = 100_000

export type TimestampUnit = 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds'
export type UnitChoice = 'auto' | TimestampUnit

export type TimestampParse =
  | { ok: true; date: Date; unit: TimestampUnit }
  | { ok: false; error: 'notNumber' | 'outOfRange' }

export function detectUnit(integerDigits: number): TimestampUnit {
  if (integerDigits <= 11) return 'seconds'
  if (integerDigits <= 14) return 'milliseconds'
  if (integerDigits <= 17) return 'microseconds'
  return 'nanoseconds'
}

const MS_FACTOR: Record<TimestampUnit, number> = {
  seconds: 1000,
  milliseconds: 1,
  microseconds: 1e-3,
  nanoseconds: 1e-6,
}

export function isNumericInput(input: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(input.trim().replace(/[_,\s]/g, ''))
}

export function parseTimestampValue(input: string, choice: UnitChoice = 'auto'): TimestampParse {
  const cleaned = input.trim().replace(/[_,\s]/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { ok: false, error: 'notNumber' }
  const integerPart = cleaned.replace('-', '').split('.')[0]
  const unit = choice === 'auto' ? detectUnit(integerPart.length) : choice
  let ms: number
  if (cleaned.includes('.')) {
    ms = Number(cleaned) * MS_FACTOR[unit]
  } else {
    const big = BigInt(cleaned)
    if (unit === 'seconds') ms = Number(big * 1000n)
    else if (unit === 'milliseconds') ms = Number(big)
    else if (unit === 'microseconds') ms = Number(big / 1000n)
    else ms = Number(big / 1_000_000n)
  }
  const date = new Date(ms)
  if (!Number.isFinite(ms) || Number.isNaN(date.getTime())) return { ok: false, error: 'outOfRange' }
  return { ok: true, date, unit }
}

const RELATIVE_UNITS: Record<string, 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'> = {
  s: 'second', sec: 'second', secs: 'second', second: 'second', seconds: 'second',
  m: 'minute', min: 'minute', mins: 'minute', minute: 'minute', minutes: 'minute',
  h: 'hour', hr: 'hour', hrs: 'hour', hour: 'hour', hours: 'hour',
  d: 'day', day: 'day', days: 'day',
  w: 'week', wk: 'week', week: 'week', weeks: 'week',
  mo: 'month', month: 'month', months: 'month',
  y: 'year', yr: 'year', year: 'year', years: 'year',
}

function shift(date: Date, amount: number, unit: (typeof RELATIVE_UNITS)[string]): Date {
  switch (unit) {
    case 'second':
      return new Date(date.getTime() + amount * 1000)
    case 'minute':
      return new Date(date.getTime() + amount * 60_000)
    case 'hour':
      return new Date(date.getTime() + amount * 3_600_000)
    case 'day':
      return addCalendarDays(date, amount)
    case 'week':
      return addCalendarDays(date, amount * 7)
    case 'month':
      return addMonthsClamped(date, amount)
    case 'year':
      return addMonthsClamped(date, amount * 12)
  }
}

/** Parses ISO / RFC strings, "today", "tomorrow", "+3d", "in 2 weeks" and "5 hours ago". */
export function parseDateText(input: string, now: Date = new Date()): Date | null {
  const text = input.trim().toLowerCase()
  if (!text) return null
  if (text === 'now') return new Date(now)
  if (text === 'today') return startOfDay(now)
  if (text === 'tomorrow') return startOfDay(addCalendarDays(now, 1))
  if (text === 'yesterday') return startOfDay(addCalendarDays(now, -1))

  const relative =
    /^(?:([+-])\s*|in\s+)?(\d+)\s*([a-z]+)(\s+ago)?$/.exec(text)
  if (relative && (relative[1] || relative[4] || text.startsWith('in '))) {
    const unit = RELATIVE_UNITS[relative[3]]
    if (unit) {
      const sign = relative[1] === '-' || relative[4] ? -1 : 1
      return shift(now, sign * Number(relative[2]), unit)
    }
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (dateOnly) {
    const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (isNumericInput(text)) return null
  const parsed = Date.parse(input.trim())
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

function pad(value: number, length = 2): string {
  return String(Math.abs(value)).padStart(length, '0')
}

export function formatOffsetMinutes(offset: number): string {
  const sign = offset >= 0 ? '+' : '-'
  return `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
}

export function isoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset()
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    formatOffsetMinutes(offset)
  )
}

export function sqlUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export interface DateFormats {
  unixSeconds: string
  unixMillis: string
  iso: string
  isoLocal: string
  rfc: string
  sql: string
  local: string
  utc: string
}

export function dateFormats(date: Date): DateFormats {
  return {
    unixSeconds: String(Math.floor(date.getTime() / 1000)),
    unixMillis: String(date.getTime()),
    iso: date.toISOString(),
    isoLocal: isoWithOffset(date),
    rfc: date.toUTCString(),
    sql: sqlUtc(date),
    local: date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }),
    utc: new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date),
  }
}

/** "tomorrow" / "in 2 days" by calendar day; falls back to hours and minutes on the same day. */
export function relativeDayLabel(date: Date, now: Date = new Date()): string {
  const days = Math.round((utcDayNumber(date) - utcDayNumber(now)) / MS_PER_DAY)
  if (days === 0 || Math.abs(days) > 6) return relativeTime(date, now)
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(days, 'day')
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function utcDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

export function dayOfYear(date: Date): number {
  return (utcDayNumber(date) - Date.UTC(date.getFullYear(), 0, 1)) / MS_PER_DAY + 1
}

export function isoWeek(date: Date): { week: number; year: number } {
  const d = new Date(utcDayNumber(date))
  const weekday = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - weekday)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  return {
    week: Math.ceil(((d.getTime() - yearStart) / MS_PER_DAY + 1) / 7),
    year: d.getUTCFullYear(),
  }
}

export interface DateDetails {
  weekday: string
  dayOfYear: number
  daysInYear: number
  week: number
  weekYear: number
  quarter: number
  daysInMonth: number
  leapYear: boolean
}

export function dateDetails(date: Date): DateDetails {
  const year = date.getFullYear()
  const week = isoWeek(date)
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    dayOfYear: dayOfYear(date),
    daysInYear: isLeapYear(year) ? 366 : 365,
    week: week.week,
    weekYear: week.year,
    quarter: Math.floor(date.getMonth() / 3) + 1,
    daysInMonth: daysInMonth(year, date.getMonth()),
    leapYear: isLeapYear(year),
  }
}

export type Boundary =
  | 'startOfDay'
  | 'endOfDay'
  | 'startOfWeek'
  | 'startOfMonth'
  | 'endOfMonth'
  | 'startOfYear'

export const BOUNDARIES: Boundary[] = [
  'startOfDay',
  'endOfDay',
  'startOfWeek',
  'startOfMonth',
  'endOfMonth',
  'startOfYear',
]

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function boundary(date: Date, kind: Boundary): Date {
  const y = date.getFullYear()
  const m = date.getMonth()
  switch (kind) {
    case 'startOfDay':
      return startOfDay(date)
    case 'endOfDay':
      return new Date(y, m, date.getDate(), 23, 59, 59, 999)
    case 'startOfWeek':
      return new Date(y, m, date.getDate() - ((date.getDay() + 6) % 7))
    case 'startOfMonth':
      return new Date(y, m, 1)
    case 'endOfMonth':
      return new Date(y, m + 1, 0, 23, 59, 59, 999)
    case 'startOfYear':
      return new Date(y, 0, 1)
  }
}

export function addCalendarDays(date: Date, amount: number): Date {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + Math.trunc(amount))
  return next
}

export function addMonthsClamped(date: Date, amount: number): Date {
  const target = new Date(
    date.getFullYear(),
    date.getMonth() + Math.trunc(amount),
    1,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  )
  target.setDate(Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth())))
  return target
}

export function addBusinessDays(date: Date, amount: number): Date {
  const step = amount < 0 ? -1 : 1
  let remaining = Math.min(Math.abs(Math.trunc(amount)), MAX_STEP_DAYS)
  const next = new Date(date.getTime())
  while (remaining > 0) {
    next.setDate(next.getDate() + step)
    if (!isWeekend(next)) remaining -= 1
  }
  return next
}

export interface Duration {
  years: number
  months: number
  weeks: number
  days: number
  hours: number
  minutes: number
}

export function addDuration(
  date: Date,
  duration: Duration,
  direction: 1 | -1,
  businessDays = false,
): Date {
  let next = addMonthsClamped(date, direction * (duration.years * 12 + duration.months))
  next = businessDays
    ? addBusinessDays(next, direction * (duration.weeks * 5 + duration.days))
    : addCalendarDays(next, direction * (duration.weeks * 7 + duration.days))
  return new Date(next.getTime() + direction * (duration.hours * 3_600_000 + duration.minutes * 60_000))
}

export interface CalendarDifference {
  /** 1 when B is after A, -1 when before, 0 when equal. */
  direction: 1 | -1 | 0
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
  totalDays: number
  totalWeeks: number
  totalHours: number
  totalMinutes: number
  totalSeconds: number
  calendarDays: number
  workingDays: number
  weekendDays: number
}

export function calendarDiff(a: Date, b: Date): CalendarDifference {
  const direction = b > a ? 1 : b < a ? -1 : 0
  const start = direction >= 0 ? a : b
  const end = direction >= 0 ? b : a

  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
  let anchor = addMonthsClamped(start, months)
  while (months > 0 && anchor > end) {
    months -= 1
    anchor = addMonthsClamped(start, months)
  }
  let days = Math.round((utcDayNumber(end) - utcDayNumber(anchor)) / MS_PER_DAY)
  let dayAnchor = addCalendarDays(anchor, days)
  while (days > 0 && dayAnchor > end) {
    days -= 1
    dayAnchor = addCalendarDays(anchor, days)
  }
  const rest = end.getTime() - dayAnchor.getTime()
  const totalMs = end.getTime() - start.getTime()

  const calendarDays = Math.round((utcDayNumber(end) - utcDayNumber(start)) / MS_PER_DAY) + 1
  let workingDays = 0
  if (calendarDays <= MAX_STEP_DAYS) {
    const cursor = startOfDay(start)
    for (let index = 0; index < calendarDays; index += 1) {
      if (!isWeekend(cursor)) workingDays += 1
      cursor.setDate(cursor.getDate() + 1)
    }
  } else {
    workingDays = Math.round((calendarDays * 5) / 7)
  }

  return {
    direction,
    years: Math.floor(months / 12),
    months: months % 12,
    days,
    hours: Math.floor(rest / 3_600_000),
    minutes: Math.floor((rest % 3_600_000) / 60_000),
    seconds: Math.floor((rest % 60_000) / 1000),
    totalDays: Math.floor(totalMs / MS_PER_DAY),
    totalWeeks: Math.floor((totalMs / MS_PER_DAY / 7) * 10) / 10,
    totalHours: Math.floor(totalMs / 3_600_000),
    totalMinutes: Math.floor(totalMs / 60_000),
    totalSeconds: Math.floor(totalMs / 1000),
    calendarDays,
    workingDays,
    weekendDays: calendarDays - workingDays,
  }
}

/* ---------- Time zones ---------- */

export const LOCAL_ZONE = 'local'

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function resolveZone(zone: string): string {
  return zone === LOCAL_ZONE ? localTimeZone() : zone
}

export function allTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  let zones: string[]
  try {
    zones = intl.supportedValuesOf?.('timeZone') ?? []
  } catch {
    zones = []
  }
  const merged = new Set(['UTC', ...COMMON_TIMEZONES.map((zone) => zone.id), ...zones])
  return [...merged].filter(isValidTimeZone)
}

/** Browsers report some zones under legacy aliases (Asia/Calcutta for Asia/Kolkata). */
const canonicalCache = new Map<string, string>()

export function canonicalZone(zone: string): string {
  let canonical = canonicalCache.get(zone)
  if (canonical === undefined) {
    try {
      canonical = new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone
    } catch {
      canonical = zone
    }
    canonicalCache.set(zone, canonical)
  }
  return canonical
}

export function sameZone(a: string, b: string): boolean {
  return a === b || canonicalZone(a) === canonicalZone(b)
}

export function zoneLabel(zone: string): string {
  const common =
    COMMON_TIMEZONES.find((entry) => entry.id === zone) ??
    COMMON_TIMEZONES.find((entry) => sameZone(entry.id, zone))
  if (common) return common.label
  return (zone.split('/').pop() ?? zone).replaceAll('_', ' ')
}

export function zoneRegion(zone: string): string {
  return zone.includes('/') ? zone.split('/')[0].replaceAll('_', ' ') : zone
}

export function offsetAt(date: Date, zone: string): number {
  const result = timeZoneOffsetMinutes(date, resolveZone(zone))
  return result.ok ? result.value : 0
}

interface WallParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export function wallParts(date: Date, zone: string): WallParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveZone(zone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/** Treats `value` ("YYYY-MM-DDTHH:mm") as wall-clock time in `zone`. */
export function wallTimeToDate(value: string, zone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  if (zone === LOCAL_ZONE) return new Date(year, month - 1, day, hour, minute)
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const first = offsetAt(new Date(guess), zone)
  let time = guess - first * 60_000
  const second = offsetAt(new Date(time), zone)
  if (second !== first) time = guess - second * 60_000
  return new Date(time)
}

export function dateToWallValue(date: Date, zone: string): string {
  const p = wallParts(date, zone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

export interface ZoneClock {
  zone: string
  label: string
  region: string
  time: string
  date: string
  hour: number
  offset: number
  /** Minutes ahead of the reference zone. */
  delta: number
  /** Calendar day difference against the reference zone (-1, 0, 1). */
  dayDelta: number
}

export function zoneClock(date: Date, zone: string, referenceZone: string): ZoneClock {
  const resolved = resolveZone(zone)
  const parts = wallParts(date, resolved)
  const ref = wallParts(date, referenceZone)
  const offset = offsetAt(date, resolved)
  return {
    zone: resolved,
    label: zoneLabel(resolved),
    region: zoneRegion(resolved),
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
    date: new Intl.DateTimeFormat(undefined, {
      timeZone: resolved,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date),
    hour: parts.hour,
    offset,
    delta: offset - offsetAt(date, referenceZone),
    dayDelta: Math.sign(
      Date.UTC(parts.year, parts.month - 1, parts.day) - Date.UTC(ref.year, ref.month - 1, ref.day),
    ),
  }
}

export function formatDelta(minutes: number): string {
  if (minutes === 0) return '±0h'
  const sign = minutes > 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  return `${sign}${hours}h${rest ? ` ${rest}m` : ''}`
}

export type DayPhase = 'night' | 'morning' | 'work' | 'evening'

export function dayPhase(hour: number): DayPhase {
  if (hour >= 9 && hour < 17) return 'work'
  if (hour >= 6 && hour < 9) return 'morning'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

/* ---------- Cron ---------- */

export const CRON_PRESETS = [
  { id: 'everyMinute', expression: '* * * * *' },
  { id: 'every5', expression: '*/5 * * * *' },
  { id: 'every15', expression: '*/15 * * * *' },
  { id: 'hourly', expression: '0 * * * *' },
  { id: 'daily9', expression: '0 9 * * *' },
  { id: 'weekdays', expression: '30 9 * * 1-5' },
  { id: 'weekly', expression: '0 0 * * 0' },
  { id: 'monthly', expression: '0 0 1 * *' },
  { id: 'yearly', expression: '0 0 1 1 *' },
] as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function cronFieldValues(field: CronField): string {
  if (field.values === 'any') return '*'
  const values =
    field.name === 'day of week' ? [...new Set(field.values.map((value) => value % 7))] : field.values
  const named = values.map((value) =>
    field.name === 'month' ? MONTHS[value - 1] : field.name === 'day of week' ? WEEKDAYS[value] : String(value),
  )
  if (named.length > 8) return `${named.slice(0, 6).join(', ')} … ${named[named.length - 1]} (${named.length})`
  return named.join(', ')
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}

export function nextCronRuns(fields: CronField[], from: Date, count: number): Date[] {
  const [minute, hour, dom, month, dow] = fields
  const allows = (field: CronField, value: number) =>
    field.values === 'any' || field.values.includes(value)
  const dowAllows = (day: number) =>
    dow.values === 'any' || dow.values.some((value) => value % 7 === day)
  const bothRestricted = dom.values !== 'any' && dow.values !== 'any'
  const dayMatches = (date: Date) => {
    if (!allows(month, date.getMonth() + 1)) return false
    const domOk = allows(dom, date.getDate())
    const dowOk = dowAllows(date.getDay())
    return bothRestricted ? domOk || dowOk : domOk && dowOk
  }
  const hours = hour.values === 'any' ? range(0, 23) : hour.values
  const minutes = minute.values === 'any' ? range(0, 59) : minute.values

  const start = new Date(from.getTime())
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)
  const day = startOfDay(start)
  const runs: Date[] = []
  for (let index = 0; index < 366 * 8 && runs.length < count; index += 1) {
    if (dayMatches(day)) {
      for (const h of hours) {
        for (const m of minutes) {
          const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
          if (candidate >= start) {
            runs.push(candidate)
            if (runs.length >= count) return runs
          }
        }
      }
    }
    day.setDate(day.getDate() + 1)
  }
  return runs
}
