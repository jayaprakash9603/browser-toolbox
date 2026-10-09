import { describe, expect, it } from 'vitest'

import { formatDateTimeValue, parseDateTimeValue } from '@/shared/components/DateTimeField'

describe('DateTimeField value format', () => {
  it('round-trips a local date and time', () => {
    const date = new Date(2026, 9, 9, 16, 5, 0, 0)
    const value = formatDateTimeValue(date)
    expect(value).toBe('2026-10-09T16:05')
    expect(parseDateTimeValue(value)?.getTime()).toBe(date.getTime())
  })

  it('returns null for an empty value', () => {
    expect(parseDateTimeValue('')).toBeNull()
  })
})