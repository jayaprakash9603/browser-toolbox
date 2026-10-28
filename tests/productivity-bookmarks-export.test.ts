import { describe, expect, it } from 'vitest'

import {
  bookmarkFolderRoots,
  exportBookmarksMarkdown,
  filterBookmarkRows,
} from '@/tools/productivity/bookmarks/service'

describe('bookmark export', () => {
  it('formats markdown list', () => {
    const md = exportBookmarksMarkdown([
      { id: '1', title: 'Docs', url: 'https://example.com', folderPath: 'Work' },
    ])
    expect(md).toBe('- [Docs](https://example.com)')
  })
})

describe('bookmark filters', () => {
  const rows = [
    { id: '1', title: 'A', url: 'https://a.com', folderPath: 'Work › Docs' },
    { id: '2', title: 'B', url: 'https://b.com', folderPath: 'Personal › Read' },
    { id: '3', title: 'C', url: 'https://c.com', folderPath: 'Work › QA' },
  ]

  it('lists top-level folder roots by frequency', () => {
    expect(bookmarkFolderRoots(rows)).toEqual(['Work', 'Personal'])
  })

  it('filters rows by folder root prefix', () => {
    expect(filterBookmarkRows(rows, 'Work')).toHaveLength(2)
    expect(filterBookmarkRows(rows, 'all')).toHaveLength(3)
  })
})
