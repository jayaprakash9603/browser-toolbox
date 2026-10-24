import { describe, expect, it } from 'vitest'

import { classifyClip, dateGroup, matchesFilter, relativeTime } from '@/tools/clipboard/clipKinds'

const entry = (overrides: { pinned?: boolean } = {}) => ({
  id: 'id',
  text: 'x',
  createdAt: 0,
  pinned: false,
  charCount: 1,
  wordCount: 1,
  ...overrides,
})

describe('classifyClip', () => {
  it.each([
    ['https://quickcalci.com/sitemap.xml', 'link'],
    ['www.example.com/page', 'link'],
    ['someone@example.com', 'email'],
    ['#4f46e5', 'color'],
    ['rgb(10, 20, 30)', 'color'],
    ['45.252.75.69', 'number'],
    ['+91 98765 43210', 'number'],
    ['{"a": 1, "b": [2]}', 'code'],
    ['const total = items.reduce((sum, item) => sum + item, 0);', 'code'],
    ['function hello() {\n  return 1\n}', 'code'],
    ['URL is not on Google\nThis page is not indexed.', 'text'],
    ['Physics calculators solve the core equations from motion, energy, and forces.', 'text'],
  ])('classifies %s as %s', (text, kind) => {
    expect(classifyClip(text)).toBe(kind)
  })
})

describe('matchesFilter', () => {
  it('groups related kinds under each filter', () => {
    expect(matchesFilter(entry(), 'email', 'link')).toBe(true)
    expect(matchesFilter(entry(), 'color', 'code')).toBe(true)
    expect(matchesFilter(entry(), 'number', 'text')).toBe(true)
    expect(matchesFilter(entry(), 'link', 'text')).toBe(false)
    expect(matchesFilter(entry({ pinned: true }), 'text', 'pinned')).toBe(true)
    expect(matchesFilter(entry(), 'text', 'pinned')).toBe(false)
  })
})

describe('dateGroup', () => {
  const now = new Date(2026, 9, 24, 13, 0).getTime()

  it('buckets timestamps into today, yesterday and earlier', () => {
    expect(dateGroup(new Date(2026, 9, 24, 0, 5).getTime(), now)).toBe('today')
    expect(dateGroup(new Date(2026, 9, 23, 23, 59).getTime(), now)).toBe('yesterday')
    expect(dateGroup(new Date(2026, 9, 22, 12, 0).getTime(), now)).toBe('earlier')
  })
})

describe('relativeTime', () => {
  const now = new Date(2026, 9, 24, 13, 0).getTime()

  it('describes recent copies relative to now', () => {
    expect(relativeTime(now - 10_000, now, 'en')).toBe('now')
    expect(relativeTime(now - 5 * 60_000, now, 'en')).toBe('5 min. ago')
    expect(relativeTime(now - 3 * 3_600_000, now, 'en')).toBe('3 hr. ago')
    expect(relativeTime(now - 30 * 86_400_000, now, 'en')).toBe('Sep 24')
  })
})
