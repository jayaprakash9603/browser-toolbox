import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import { parseCron } from '@/core/engines/date'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import DateTimeToolkitTool from '@/tools/datetime/datetime-toolkit/Tool'
import {
  addBusinessDays,
  addDuration,
  boundary,
  calendarDiff,
  dayOfYear,
  formatDelta,
  isoWeek,
  nextCronRuns,
  parseDateText,
  parseTimestampValue,
  relativeDayLabel,
  wallTimeToDate,
  zoneClock,
} from '@/tools/datetime/datetime-toolkit/dateModel'
import { resetChromeMockStorage } from './setup'

registerModules()

const NONE = { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0 }

describe('date model', () => {
  it('detects timestamp units from digit count', () => {
    const seconds = parseTimestampValue('1743256800')
    expect(seconds.ok && seconds.unit).toBe('seconds')
    expect(seconds.ok && seconds.date.getTime()).toBe(1743256800000)
    const millis = parseTimestampValue('1743256800123')
    expect(millis.ok && millis.unit).toBe('milliseconds')
    const micros = parseTimestampValue('1743256800123456')
    expect(micros.ok && micros.unit).toBe('microseconds')
    expect(micros.ok && micros.date.getTime()).toBe(1743256800123)
    const nanos = parseTimestampValue('1743256800123456789')
    expect(nanos.ok && nanos.unit).toBe('nanoseconds')
    expect(nanos.ok && nanos.date.getTime()).toBe(1743256800123)
    const forced = parseTimestampValue('1743256800', 'milliseconds')
    expect(forced.ok && forced.date.getTime()).toBe(1743256800)
    expect(parseTimestampValue('1_743_256_800').ok).toBe(true)
    expect(parseTimestampValue('soon')).toEqual({ ok: false, error: 'notNumber' })
  })

  it('reads natural and relative date text', () => {
    const now = new Date(2026, 9, 24, 15, 30)
    expect(parseDateText('today', now)).toEqual(new Date(2026, 9, 24))
    expect(parseDateText('tomorrow', now)).toEqual(new Date(2026, 9, 25))
    expect(parseDateText('+3d', now)).toEqual(new Date(2026, 9, 27, 15, 30))
    expect(parseDateText('2 weeks ago', now)).toEqual(new Date(2026, 9, 10, 15, 30))
    expect(parseDateText('in 5 hours', now)).toEqual(new Date(2026, 9, 24, 20, 30))
    expect(parseDateText('2026-10-24', now)).toEqual(new Date(2026, 9, 24))
    expect(parseDateText('2026-10-24T10:00:00Z', now)?.toISOString()).toBe('2026-10-24T10:00:00.000Z')
    expect(parseDateText('not a date', now)).toBeNull()
  })

  it('computes calendar differences in both directions', () => {
    const a = new Date(2024, 0, 31)
    const b = new Date(2024, 2, 1, 6, 30)
    const diff = calendarDiff(a, b)
    expect(diff).toMatchObject({ direction: 1, years: 0, months: 1, days: 1, hours: 6, minutes: 30 })
    expect(diff.totalDays).toBe(30)
    expect(diff.calendarDays).toBe(31)
    expect(diff.workingDays + diff.weekendDays).toBe(31)
    expect(calendarDiff(b, a)).toMatchObject({ direction: -1, months: 1, days: 1 })
    expect(calendarDiff(a, a).direction).toBe(0)
  })

  it('adds durations with month clamping and business days', () => {
    expect(addDuration(new Date(2024, 0, 31), { ...NONE, months: 1 }, 1)).toEqual(new Date(2024, 1, 29))
    expect(addDuration(new Date(2026, 9, 24), { ...NONE, days: 3 }, -1)).toEqual(new Date(2026, 9, 21))
    expect(addBusinessDays(new Date(2026, 9, 23), 1)).toEqual(new Date(2026, 9, 26))
    expect(addDuration(new Date(2026, 9, 23), { ...NONE, weeks: 1 }, 1, true)).toEqual(new Date(2026, 9, 30))
  })

  it('reports ISO week, day of year and boundaries', () => {
    expect(isoWeek(new Date(2021, 0, 3))).toEqual({ week: 53, year: 2020 })
    expect(isoWeek(new Date(2026, 9, 24))).toEqual({ week: 43, year: 2026 })
    expect(dayOfYear(new Date(2024, 11, 31))).toBe(366)
    expect(boundary(new Date(2026, 9, 24, 15), 'startOfWeek')).toEqual(new Date(2026, 9, 19))
    expect(boundary(new Date(2026, 1, 10), 'endOfMonth')).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999))
  })

  it('converts wall-clock time in a zone, including daylight saving', () => {
    expect(wallTimeToDate('2026-01-15T09:00', 'America/New_York')?.toISOString()).toBe('2026-01-15T14:00:00.000Z')
    expect(wallTimeToDate('2026-07-15T09:00', 'America/New_York')?.toISOString()).toBe('2026-07-15T13:00:00.000Z')
    expect(wallTimeToDate('2026-07-15T09:00', 'Asia/Kolkata')?.toISOString()).toBe('2026-07-15T03:30:00.000Z')
  })

  it('describes zone clocks against a reference zone', () => {
    const clock = zoneClock(new Date('2026-01-15T23:30:00Z'), 'Asia/Tokyo', 'UTC')
    expect(clock).toMatchObject({ time: '08:30', dayDelta: 1, delta: 540, label: 'Tokyo' })
    expect(formatDelta(330)).toBe('+5h 30m')
    expect(formatDelta(-60)).toBe('-1h')
    expect(formatDelta(0)).toBe('±0h')
  })

  it('labels relative days by calendar day', () => {
    const now = new Date(2026, 9, 24, 12, 0)
    expect(relativeDayLabel(new Date(2026, 9, 26, 9, 30), now)).toBe('in 2 days')
    expect(relativeDayLabel(new Date(2026, 9, 25, 1, 0), now)).toBe('tomorrow')
    expect(relativeDayLabel(new Date(2026, 9, 24, 15, 0), now)).toBe('in 3 hours')
  })

  it('lists upcoming cron runs', () => {
    const from = new Date(2026, 9, 24, 12, 0)
    const weekdays = parseCron('30 9 * * 1-5')
    if (!weekdays.ok) throw new Error('cron should parse')
    expect(nextCronRuns(weekdays.fields, from, 2)).toEqual([
      new Date(2026, 9, 26, 9, 30),
      new Date(2026, 9, 27, 9, 30),
    ])
    const monthly = parseCron('0 0 1 * *')
    if (!monthly.ok) throw new Error('cron should parse')
    expect(nextCronRuns(monthly.fields, from, 2)).toEqual([new Date(2026, 10, 1), new Date(2026, 11, 1)])
    const either = parseCron('0 0 13 * 5')
    if (!either.ok) throw new Error('cron should parse')
    expect(nextCronRuns(either.fields, from, 1)).toEqual([new Date(2026, 9, 30)])
  })
})

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <DateTimeToolkitTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  resetChromeMockStorage()
})

afterEach(() => {
  cleanup()
})

describe('Date & Time Toolkit', { timeout: 20_000 }, () => {
  it('converts a pasted timestamp into format cards', async () => {
    renderTool()
    fireEvent.change(screen.getByRole('textbox', { name: 'Timestamp or date' }), {
      target: { value: '1743256800' },
    })
    expect(await screen.findByText(new Date(1743256800000).toISOString())).toBeInTheDocument()
    expect(screen.getByText('Read as seconds')).toBeInTheDocument()
    expect(screen.getByText('ISO 8601 (UTC)')).toBeInTheDocument()
  })

  it('shows an error for unreadable dates', async () => {
    renderTool()
    fireEvent.change(screen.getByRole('textbox', { name: 'Timestamp or date' }), {
      target: { value: 'banana' },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read that as a date')
  })

  it('previews cron presets with next runs', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(screen.getByRole('tab', { name: /Cron/ }))
    await user.click(await screen.findByRole('button', { name: 'Monthly' }))
    expect(screen.getByRole('textbox', { name: 'Expression' })).toHaveValue('0 0 1 * *')
    const runs = screen.getByRole('heading', { name: 'Next runs' }).closest('section')!
    await waitFor(() => expect(within(runs).getAllByRole('listitem')).toHaveLength(5))
  })

  it('adds a time zone from the picker', async () => {
    const user = userEvent.setup()
    renderTool()
    await user.click(screen.getByRole('tab', { name: /Timezones/ }))
    expect(await screen.findByText('Tokyo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Add zone/ }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Paris' } })
    await user.click(await screen.findByRole('button', { name: /Europe\/Paris/ }))
    expect(await screen.findByRole('button', { name: 'Use Paris as the reference time' })).toBeInTheDocument()
  })
})
