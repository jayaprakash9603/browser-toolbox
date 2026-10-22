import { describe, expect, it } from 'vitest'

import { badgeTime, formatBytes, formatDuration, safeFileName } from '@/core/recorder/format'

describe('recorder formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_400)).toBe('1:05')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })

  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB')
  })

  it('keeps badge text short', () => {
    expect(badgeTime(9_000)).toBe('0:09')
    expect(badgeTime(125_000)).toBe('2:05')
    expect(badgeTime(2 * 3600 * 1000)).toBe('2h')
  })

  it('sanitizes file names', () => {
    expect(safeFileName('a/b:c?')).toBe('a-b-c-')
    expect(safeFileName('   ')).toBe('recording')
  })
})
