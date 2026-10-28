import { describe, expect, it } from 'vitest'

import { exportReadingMarkdown, filterReadingList, newReadingItem } from '@/tools/productivity/reading-list/model'

describe('reading list model', () => {
  it('filters unread items', () => {
    const items = [
      newReadingItem({ url: 'https://a.test', title: 'A', note: 'note' }),
      { ...newReadingItem({ url: 'https://b.test', title: 'B' }), read: true },
    ]
    expect(filterReadingList(items, '', 'unread')).toHaveLength(1)
    expect(filterReadingList(items, 'note', 'all')).toHaveLength(1)
  })

  it('exports markdown links', () => {
    const md = exportReadingMarkdown([newReadingItem({ url: 'https://x.test', title: 'X', note: 'why' })])
    expect(md).toContain('[X](https://x.test)')
    expect(md).toContain('why')
  })
})
