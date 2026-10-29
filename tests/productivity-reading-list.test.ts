import { describe, expect, it } from 'vitest'

import {
  exportReadingCsv,
  exportReadingMarkdown,
  filterReadingList,
  mergeImportedReading,
  newReadingItem,
  parseReadingTags,
  readingProgress,
  sortReadingList,
} from '@/tools/productivity/reading-list/model'

describe('reading list model', () => {
  it('filters unread items', () => {
    const items = [
      newReadingItem({ url: 'https://a.test', title: 'A', note: 'note' }),
      { ...newReadingItem({ url: 'https://b.test', title: 'B' }), read: true },
    ]
    expect(filterReadingList(items, '', 'unread')).toHaveLength(1)
    expect(filterReadingList(items, 'note', 'all')).toHaveLength(1)
  })

  it('exports markdown links with tags', () => {
    const md = exportReadingMarkdown([newReadingItem({ url: 'https://x.test', title: 'X', note: 'why', tags: ['ui'] })])
    expect(md).toContain('[X](https://x.test)')
    expect(md).toContain('why')
    expect(md).toContain('#ui')
  })

  it('filters starred items and tags', () => {
    const items = [
      { ...newReadingItem({ url: 'https://a.test', title: 'A', tags: ['ui'] }), starred: true },
      newReadingItem({ url: 'https://b.test', title: 'B', tags: ['api'] }),
    ]
    expect(filterReadingList(items, '', 'starred')).toHaveLength(1)
    expect(filterReadingList(items, '', 'all', 'api')).toHaveLength(1)
    expect(filterReadingList(items, '#ui', 'all')).toHaveLength(1)
  })

  it('parses tags and sorts by domain', () => {
    expect(parseReadingTags('#UI, api  ui')).toEqual(['ui', 'api'])
    const sorted = sortReadingList(
      [newReadingItem({ url: 'https://z.test/a', title: 'Z' }), newReadingItem({ url: 'https://a.test/a', title: 'A' })],
      'domain',
    )
    expect(sorted[0].title).toBe('A')
  })

  it('computes progress and neutralizes CSV formulas', () => {
    const items = [
      { ...newReadingItem({ url: 'https://a.test', title: '=SUM(1)' }), read: true },
      newReadingItem({ url: 'https://b.test', title: 'B' }),
    ]
    expect(readingProgress(items)).toEqual({ read: 1, total: 2, pct: 50 })
    expect(exportReadingCsv(items)).toContain(`"'=SUM(1)"`)
  })

  it('merges imports without duplicating urls', () => {
    const existing = [newReadingItem({ url: 'https://a.test', title: 'A' })]
    const merged = mergeImportedReading(existing, [
      { url: 'https://a.test', title: 'dup' },
      { url: 'https://c.test', title: 'C', tags: ['x'] },
      { url: 'javascript:alert(1)', title: 'bad' },
    ])
    expect(merged.map((item) => item.url)).toEqual(['https://a.test', 'https://c.test'])
  })
})
