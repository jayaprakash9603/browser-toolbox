import { describe, expect, it } from 'vitest'

import {
  addDays,
  convertTimeZone,
  dateToTimestamp,
  diffDates,
  isWeekend,
  looksLikeTimestamp,
  nowTimestamp,
  parseCron,
  parseTimestamp,
  relativeTime,
  workingDaysBetween,
} from '@/core/engines/date'

describe('date engine — timestamps', () => {
  it('parses seconds and milliseconds', () => {
    const seconds = parseTimestamp('1743256800')
    expect(seconds.ok).toBe(true)
    if (seconds.ok) {
      expect(seconds.value.kind).toBe('seconds')
      expect(seconds.value.date.getUTCFullYear()).toBe(2025)
    }
    const millis = parseTimestamp('1743256800000')
    expect(millis.ok).toBe(true)
    if (millis.ok) expect(millis.value.kind).toBe('milliseconds')
  })

  it('rejects non-numeric and empty input', () => {
    expect(parseTimestamp('').ok).toBe(false)
    expect(parseTimestamp('12x').ok).toBe(false)
  })

  it('converts dates both ways', () => {
    const date = new Date(Date.UTC(2025, 2, 29, 14, 0, 0))
    expect(dateToTimestamp(date, 'seconds')).toBe(Math.floor(date.getTime() / 1000))
    expect(dateToTimestamp(date, 'milliseconds')).toBe(date.getTime())
    expect(nowTimestamp('seconds')).toBeLessThanOrEqual(nowTimestamp('milliseconds'))
  })

  it('detects timestamps loosely', () => {
    expect(looksLikeTimestamp('1743256800')).toBe(true)
    expect(looksLikeTimestamp('123')).toBe(false)
    expect(looksLikeTimestamp('abc')).toBe(false)
  })
})

describe('date engine — relative and arithmetic', () => {
  it('formats relative time', () => {
    const now = new Date('2026-10-07T12:00:00Z')
    expect(relativeTime(new Date('2026-10-07T11:30:00Z'), now)).toBe('30 minutes ago')
    expect(relativeTime(new Date('2026-10-09T12:00:00Z'), now)).toBe('in 2 days')
  })

  it('computes date differences', () => {
    const diff = diffDates(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-10T12:30:00Z'))
    expect(diff.totalDays).toBe(9)
    expect(diff.weeks).toBe(1)
    expect(diff.days).toBe(2)
    expect(diff.hours).toBe(12)
    expect(diff.minutes).toBe(30)
  })

  it('adds and subtracts days', () => {
    const start = new Date('2026-01-31T12:00:00Z')
    expect(addDays(start, 1).getUTCMonth()).toBe(1)
    expect(addDays(start, -1).getUTCDate()).toBe(30)
  })

  it('counts working days', () => {
    expect(isWeekend(new Date('2026-10-04T00:00:00Z'))).toBe(true)
    expect(isWeekend(new Date('2026-10-07T00:00:00Z'))).toBe(false)
    expect(workingDaysBetween(new Date('2026-10-05'), new Date('2026-10-11'))).toBe(5)
  })

  it('converts timezones and rejects unknown zones', () => {
    const date = new Date('2026-10-07T12:00:00Z')
    const result = convertTimeZone(date, 'Asia/Kolkata')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('17:30')
    expect(convertTimeZone(date, 'Mars/Olympus').ok).toBe(false)
  })
})

describe('date engine — cron', () => {
  it('parses a simple daily cron', () => {
    const result = parseCron('30 9 * * *')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.description).toContain('09:30')
  })

  it('parses ranges, lists and steps', () => {
    const result = parseCron('0 9-17/2 1 jan mon')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.fields[1].values).toEqual([9, 11, 13, 15, 17])
      expect(result.fields[3].values).toEqual([1])
      expect(result.fields[4].values).toEqual([1])
      expect(result.description).toMatch(/day-of-month 1/)
    }
  })

  it('rejects wrong field counts and out-of-range values', () => {
    expect(parseCron('* * * *').ok).toBe(false)
    expect(parseCron('99 * * * *').ok).toBe(false)
    expect(parseCron('*/0 * * * *').ok).toBe(false)
  })
})
