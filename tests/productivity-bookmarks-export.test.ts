import { describe, expect, it } from 'vitest'

import { exportBookmarksMarkdown } from '@/tools/productivity/bookmarks/service'

describe('bookmark export', () => {
  it('formats markdown list', () => {
    const md = exportBookmarksMarkdown([
      { id: '1', title: 'Docs', url: 'https://example.com', folderPath: 'Work' },
    ])
    expect(md).toBe('- [Docs](https://example.com)')
  })
})
