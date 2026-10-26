import {
  addDays,
  addMonths,
  nextOccurrence,
  startOfDay,
  withTime,
  type TaskPriority,
  type TaskRecurrence,
} from './model'

/** `date` covers dates, times and repeats; they share one chip and one "keep as text" switch. */
export type ParsedKind = 'date' | 'priority' | 'project' | 'label'

export interface ParsedToken {
  kind: ParsedKind
  start: number
  end: number
  text: string
}

export interface ParsedTask {
  title: string
  due: number | null
  allDay: boolean
  recurrence: TaskRecurrence | null
  priority: TaskPriority | null
  project: string | null
  labels: string[]
  tokens: ParsedToken[]
}

export interface ParseOptions {
  now?: number
  ignore?: readonly ParsedKind[]
  /** Read `10/11` as 10 November. Defaults to the browser locale's order. */
  dayFirst?: boolean
}

interface DateValue {
  day: number
  time?: { h: number; m: number }
  exact?: number
}

interface Candidate<T> {
  start: number
  end: number
  value: T
}

interface Pattern<T> {
  re: RegExp
  build: (match: RegExpExecArray, now: number) => T | null
}

const L = '(?<=^|[\\s(,])'
const R = '(?=$|[\\s),.!?;:])'
const PREFIX = '(?:(?:on|by|due|for|this)\\s+)?'

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  weds: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thur: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}
const WEEKDAY_ALT =
  'monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun'

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}
const MONTH_ALT =
  'january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec'

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

function re(source: string): RegExp {
  return new RegExp(`${L}${source}${R}`, 'giu')
}

/** Days from today until the weekday; `includeToday` lets "every monday" start today. */
function daysUntil(now: number, weekday: number, includeToday: boolean): number {
  const diff = (weekday - new Date(now).getDay() + 7) % 7
  return diff === 0 && !includeToday ? 7 : diff
}

function validDay(year: number, month: number, day: number): number | null {
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date.getTime()
}

/** A date written without a year means its next occurrence. */
function upcomingDate(now: number, month: number, day: number, year?: number): number | null {
  const today = startOfDay(now)
  if (year != null) return validDay(year, month, day)
  const thisYear = new Date(now).getFullYear()
  const candidate = validDay(thisYear, month, day)
  if (candidate != null && candidate >= today) return candidate
  return validDay(thisYear + 1, month, day)
}

function normalizeYear(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const year = Number(raw)
  return raw.length === 2 ? 2000 + year : year
}

function localeDayFirst(): boolean {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'numeric' }).formatToParts(
      new Date(2000, 10, 22),
    )
    return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month')
  } catch {
    return false
  }
}

const RECURRENCE_PATTERNS: Pattern<{ recurrence: TaskRecurrence; day: number }>[] = [
  {
    re: re(`every\\s+(${WEEKDAY_ALT})`),
    build: (m, now) => ({
      recurrence: 'weekly',
      day: addDays(startOfDay(now), daysUntil(now, WEEKDAYS[m[1].toLowerCase()], true)),
    }),
  },
  {
    re: re('every\\s+(day|weekday|week|month|year)'),
    build: (m, now) => {
      const word = m[1].toLowerCase()
      const today = startOfDay(now)
      if (word === 'weekday') {
        const day = new Date(now).getDay()
        const offset = day === 6 ? 2 : day === 0 ? 1 : 0
        return { recurrence: 'weekdays', day: addDays(today, offset) }
      }
      const map: Record<string, TaskRecurrence> = {
        day: 'daily',
        week: 'weekly',
        month: 'monthly',
        year: 'yearly',
      }
      return { recurrence: map[word], day: today }
    },
  },
]

function datePatterns(dayFirst: boolean): Pattern<DateValue>[] {
  return [
    { re: re(`${PREFIX}(today|tod)`), build: (_m, now) => ({ day: startOfDay(now) }) },
    {
      re: re(`${PREFIX}tonight`),
      build: (_m, now) => ({ day: startOfDay(now), time: { h: 20, m: 0 } }),
    },
    {
      re: re(`${PREFIX}(tomorrow|tmrw|tmr)`),
      build: (_m, now) => ({ day: addDays(startOfDay(now), 1) }),
    },
    {
      re: re(`${PREFIX}yesterday`),
      build: (_m, now) => ({ day: addDays(startOfDay(now), -1) }),
    },
    {
      re: re(`${PREFIX}next\\s+week`),
      build: (_m, now) => ({ day: addDays(startOfDay(now), daysUntil(now, 1, false)) }),
    },
    {
      re: re(`${PREFIX}next\\s+month`),
      build: (_m, now) => {
        const date = new Date(now)
        return { day: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() }
      },
    },
    {
      re: re(`${PREFIX}(?:the\\s+)?weekend`),
      build: (_m, now) => {
        const weekday = new Date(now).getDay()
        const offset = weekday === 6 || weekday === 0 ? 0 : 6 - weekday
        return { day: addDays(startOfDay(now), offset) }
      },
    },
    {
      re: re(`((?:on|by|due|for|this)\\s+)?(next\\s+)?(${WEEKDAY_ALT})`),
      build: (m, now) => {
        const word = m[3].toLowerCase()
        // "sat" and "sun" are common words; only read them as days with a lead-in.
        if ((word === 'sat' || word === 'sun') && !m[1] && !m[2]) return null
        const offset = daysUntil(now, WEEKDAYS[word], false) + (m[2] ? 7 : 0)
        return { day: addDays(startOfDay(now), offset) }
      },
    },
    {
      re: re(
        '(?:in\\s+)(\\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(minutes?|mins?|hours?|hrs?|h|days?|weeks?|months?|years?)',
      ),
      build: (m, now) => {
        const amount = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1].toLowerCase()]
        const unit = m[2].toLowerCase()
        if (!amount) return null
        if (unit.startsWith('min')) {
          const exact = now + amount * 60_000
          return { day: startOfDay(exact), exact }
        }
        if (unit.startsWith('h')) {
          const exact = now + amount * 3_600_000
          return { day: startOfDay(exact), exact }
        }
        const today = startOfDay(now)
        if (unit.startsWith('day')) return { day: addDays(today, amount) }
        if (unit.startsWith('week')) return { day: addDays(today, amount * 7) }
        if (unit.startsWith('month')) return { day: addMonths(today, amount) }
        return { day: addMonths(today, amount * 12) }
      },
    },
    {
      re: re(`${PREFIX}(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`),
      build: (m, now) => {
        const day = upcomingDate(now, MONTHS[m[1].toLowerCase()], Number(m[2]), normalizeYear(m[3]))
        return day == null ? null : { day }
      },
    },
    {
      re: re(`${PREFIX}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_ALT})\\.?(?:,?\\s+(\\d{4}))?`),
      build: (m, now) => {
        const day = upcomingDate(now, MONTHS[m[2].toLowerCase()], Number(m[1]), normalizeYear(m[3]))
        return day == null ? null : { day }
      },
    },
    {
      re: re(`${PREFIX}(\\d{4})-(\\d{1,2})-(\\d{1,2})`),
      build: (m) => {
        const day = validDay(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        return day == null ? null : { day }
      },
    },
    {
      // Bare fractions like "1/2" are too ambiguous; require a lead-in word or a year.
      re: re('(?:(on|by|due|for)\\s+)?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2}|\\d{4}))?'),
      build: (m, now) => {
        if (!m[1] && !m[4]) return null
        const first = Number(m[2])
        const second = Number(m[3])
        const [day, month] = dayFirst ? [first, second] : [second, first]
        const value = upcomingDate(now, month - 1, day, normalizeYear(m[4]))
        return value == null ? null : { day: value }
      },
    },
  ]
}

const PART_OF_DAY: Record<string, { h: number; m: number }> = {
  morning: { h: 9, m: 0 },
  afternoon: { h: 15, m: 0 },
  evening: { h: 18, m: 0 },
  night: { h: 20, m: 0 },
}

const TIME_PATTERNS: Pattern<{ h: number; m: number }>[] = [
  {
    // "2 a day" is not 2am: the one-letter suffix must touch the number.
    re: re('(?:(?:at|by|@)\\s*)?(\\d{1,2})(?::(\\d{2}))?(?:\\s?(am|pm|a\\.m\\.|p\\.m\\.)|(a|p))'),
    build: (m) => {
      const hour = Number(m[1])
      const minute = m[2] ? Number(m[2]) : 0
      if (hour < 1 || hour > 12 || minute > 59) return null
      const pm = (m[3] ?? m[4]).toLowerCase().startsWith('p')
      return { h: (hour % 12) + (pm ? 12 : 0), m: minute }
    },
  },
  {
    re: re('(?:(?:at|by)\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)'),
    build: (m) => ({ h: Number(m[1]), m: Number(m[2]) }),
  },
  { re: re('(?:at\\s+)?(?:noon|midday)'), build: () => ({ h: 12, m: 0 }) },
  { re: re('(?:at\\s+)?midnight'), build: () => ({ h: 23, m: 59 }) },
  {
    // A bare "morning" is usually part of the title ("morning pages"), so ask for a lead-in.
    re: re('(?:in\\s+the|this)\\s+(morning|afternoon|evening)'),
    build: (m) => PART_OF_DAY[m[1].toLowerCase()],
  },
]

/** "tomorrow morning", "fri evening": a part of day right after a date. */
const ADJACENT_PART_OF_DAY = /^(\s+)(morning|afternoon|evening|night)(?=$|[\s),.!?;:])/i

const PRIORITY_RE = re('(p[1-4])')
const LABEL_RE = new RegExp(`${L}@([\\p{L}\\p{N}_][\\p{L}\\p{N}_\\-]*)`, 'giu')
// Starts with a letter so issue numbers like "#42" stay in the title.
const PROJECT_RE = new RegExp(`${L}#(\\p{L}[\\p{L}\\p{N}_\\-]*)`, 'giu')

/** Leftmost valid match across patterns; the longer one wins a tie. */
function findFirst<T>(masked: string, patterns: Pattern<T>[], now: number): Candidate<T> | null {
  let best: Candidate<T> | null = null
  for (const { re: pattern, build } of patterns) {
    pattern.lastIndex = 0
    for (let match = pattern.exec(masked); match; match = pattern.exec(masked)) {
      const value = build(match, now)
      if (value != null) {
        const candidate = { start: match.index, end: match.index + match[0].length, value }
        if (!best || candidate.start < best.start || (candidate.start === best.start && candidate.end > best.end)) {
          best = candidate
        }
        break
      }
    }
  }
  return best
}

function mask(text: string, start: number, end: number): string {
  return text.slice(0, start) + ' '.repeat(end - start) + text.slice(end)
}

function cleanTitle(input: string, tokens: ParsedToken[]): string {
  let title = input
  for (const token of [...tokens].sort((a, b) => b.start - a.start)) {
    title = title.slice(0, token.start) + ' ' + title.slice(token.end)
  }
  return title
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, '')
}

/**
 * Reads Todoist-style quick-add text: dates and times ("tomorrow 5pm", "next fri", "in 2 hours"),
 * repeats ("every monday"), priority ("p1"), project ("#Work") and labels ("@reading").
 */
export function parseQuickAdd(input: string, options: ParseOptions = {}): ParsedTask {
  const now = options.now ?? Date.now()
  const ignore = new Set(options.ignore ?? [])
  const tokens: ParsedToken[] = []
  let masked = input

  const take = (kind: ParsedKind, start: number, end: number) => {
    tokens.push({ kind, start, end, text: input.slice(start, end) })
    masked = mask(masked, start, end)
  }

  let due: number | null = null
  let allDay = true
  let recurrence: TaskRecurrence | null = null

  if (!ignore.has('date')) {
    const repeat = findFirst(masked, RECURRENCE_PATTERNS, now)
    if (repeat) take('date', repeat.start, repeat.end)
    const date = findFirst(masked, datePatterns(options.dayFirst ?? localeDayFirst()), now)
    if (date) take('date', date.start, date.end)
    let time: Candidate<{ h: number; m: number }> | null = null
    if (date && date.value.exact == null) {
      const adjacent = ADJACENT_PART_OF_DAY.exec(masked.slice(date.end))
      if (adjacent) {
        const start = date.end + adjacent[1].length
        time = { start, end: start + adjacent[2].length, value: PART_OF_DAY[adjacent[2].toLowerCase()] }
      }
    }
    if (!time && date?.value.exact == null) time = findFirst(masked, TIME_PATTERNS, now)
    if (time) take('date', time.start, time.end)

    recurrence = repeat?.value.recurrence ?? null
    const clock = time?.value ?? date?.value.time
    if (date?.value.exact != null) {
      due = date.value.exact
      allDay = false
    } else if (date || repeat) {
      const day = date?.value.day ?? repeat!.value.day
      due = clock ? withTime(day, clock.h, clock.m) : day
      allDay = !clock
      // "every weekday 9:30" typed at 10:00 starts with the next occurrence, not an overdue one.
      if (!date && repeat && clock && due <= now) {
        due = nextOccurrence(due, false, repeat.value.recurrence, now) ?? due
      }
    } else if (clock) {
      const today = withTime(now, clock.h, clock.m)
      due = today > now ? today : addDays(today, 1)
      allDay = false
    }
  }

  let priority: TaskPriority | null = null
  if (!ignore.has('priority')) {
    PRIORITY_RE.lastIndex = 0
    const match = PRIORITY_RE.exec(masked)
    if (match) {
      priority = Number(match[1].slice(1)) as TaskPriority
      take('priority', match.index, match.index + match[0].length)
    }
  }

  let project: string | null = null
  if (!ignore.has('project')) {
    PROJECT_RE.lastIndex = 0
    const match = PROJECT_RE.exec(masked)
    if (match) {
      project = match[1]
      take('project', match.index, match.index + match[0].length)
    }
  }

  const labels: string[] = []
  if (!ignore.has('label')) {
    LABEL_RE.lastIndex = 0
    const found: Array<{ start: number; end: number; name: string }> = []
    for (let match = LABEL_RE.exec(masked); match; match = LABEL_RE.exec(masked)) {
      found.push({ start: match.index, end: match.index + match[0].length, name: match[1] })
    }
    for (const label of found) {
      if (!labels.some((l) => l.toLowerCase() === label.name.toLowerCase())) labels.push(label.name)
      take('label', label.start, label.end)
    }
  }

  tokens.sort((a, b) => a.start - b.start)
  return {
    title: cleanTitle(input, tokens),
    due,
    allDay,
    recurrence,
    priority,
    project,
    labels,
    tokens,
  }
}

/** Reads text that should be only a date, such as the due picker's "Type a date" field. */
export function parseDueText(
  text: string,
  now = Date.now(),
): { due: number; allDay: boolean; recurrence: TaskRecurrence | null } | null {
  const parsed = parseQuickAdd(text, { now, ignore: ['priority', 'project', 'label'] })
  if (parsed.due == null) return null
  return { due: parsed.due, allDay: parsed.allDay, recurrence: parsed.recurrence }
}
