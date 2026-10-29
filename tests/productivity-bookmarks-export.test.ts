import { describe, expect, it } from 'vitest'

import {
  bookmarkFolderRoots,
  chromeMoveIndex,
  duplicateBookmarkIds,
  exportBookmarksCsv,
  exportBookmarksHtml,
  exportBookmarksMarkdown,
  filterBookmarkDomain,
  filterBookmarkRows,
  filterBookmarkView,
  flattenBookmarkTree,
  folderSubtreeIds,
  folderTrail,
  moveItem,
  parseBookmarkTree,
  topBookmarkDomains,
} from '@/tools/productivity/bookmarks/service'
import { deriveBookmarkList } from '@/tools/productivity/bookmarks/bookmarkList'

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

describe('bookmark insights and exports', () => {
  const rows = [
    { id: '1', title: 'A', url: 'https://www.a.com/x/', folderPath: 'Work', dateAdded: Date.now() },
    { id: '2', title: 'A again', url: 'https://a.com/x#top', folderPath: 'Read', dateAdded: 1 },
    { id: '3', title: '=cmd', url: 'https://b.com/?q="1"', folderPath: 'Read', dateAdded: Date.now() },
  ]

  it('detects duplicate urls ignoring hash and trailing slash', () => {
    expect([...duplicateBookmarkIds(rows)].sort()).toEqual(['1', '2'])
  })

  it('filters recent and duplicate views', () => {
    const dupes = duplicateBookmarkIds(rows)
    expect(filterBookmarkView(rows, 'recent', dupes).map((r) => r.id)).toEqual(['1', '3'])
    expect(filterBookmarkView(rows, 'duplicates', dupes)).toHaveLength(2)
  })

  it('escapes csv formulas and html attributes', () => {
    expect(exportBookmarksCsv(rows)).toContain(`"'=cmd"`)
    expect(exportBookmarksHtml(rows)).toContain('q=&quot;1&quot;')
  })

  it('groups domains and filters by one', () => {
    expect(topBookmarkDomains(rows)).toEqual([{ domain: 'a.com', count: 2 }])
    expect(filterBookmarkDomain(rows, 'a.com')).toHaveLength(2)
  })

  it('flattens the bookmark tree with folder paths', () => {
    expect(flattenBookmarkTree(TREE)).toEqual([
      { id: '3', title: 'Docs', url: 'https://d.test', folderPath: 'Bar', parentId: '1', index: 0 },
      { id: '4', title: 'Mail', url: 'https://m.test', folderPath: 'Bar › Work', parentId: '2', index: 0 },
      { id: '5', title: 'Chat', url: 'https://c.test', folderPath: 'Bar › Work', parentId: '2', index: 1 },
    ])
  })
})

const TREE = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bar',
        parentId: '0',
        index: 0,
        children: [
          { id: '3', title: 'Docs', url: 'https://d.test', parentId: '1', index: 0 },
          {
            id: '2',
            title: 'Work',
            parentId: '1',
            index: 1,
            children: [
              { id: '4', title: 'Mail', url: 'https://m.test', parentId: '2', index: 0 },
              { id: '5', title: 'Chat', url: 'https://c.test', parentId: '2', index: 1 },
            ],
          },
        ],
      },
    ],
  },
] as chrome.bookmarks.BookmarkTreeNode[]

describe('bookmark folders and browsing', () => {
  const library = parseBookmarkTree(TREE)
  const state = { query: '', folderId: 'all', domain: 'all', view: 'all', sort: 'recent' } as const

  it('builds folders with depth, counts and protected roots', () => {
    const [bar, work] = library.folders
    expect(bar).toMatchObject({ id: '1', depth: 0, directCount: 1, count: 3, editable: false })
    expect(work).toMatchObject({ id: '2', depth: 1, directCount: 2, count: 2, editable: true })
  })

  it('builds a breadcrumb trail and subtree ids', () => {
    expect(folderTrail(library.folders, '2').map((f) => f.title)).toEqual(['Bar', 'Work'])
    expect([...folderSubtreeIds(library.folders, '1')].sort()).toEqual(['1', '2'])
  })

  it('browses a folder: subfolders plus direct rows in manual order', () => {
    const list = deriveBookmarkList(library, { ...state, folderId: '1', sort: 'manual' })
    expect(list.subfolders.map((f) => f.id)).toEqual(['2'])
    expect(list.rows.map((r) => r.id)).toEqual(['3'])
    expect(list.reorderable).toBe(true)
  })

  it('searches the whole subtree and disables reordering', () => {
    const list = deriveBookmarkList(library, { ...state, folderId: '1', sort: 'manual', query: 'mail' })
    expect(list.rows.map((r) => r.id)).toEqual(['4'])
    expect(list.subfolders).toEqual([])
    expect(list.reorderable).toBe(false)
  })

  it('keeps all bookmarks flat and never reorderable', () => {
    const list = deriveBookmarkList(library, { ...state, sort: 'manual' })
    expect(list.rows).toHaveLength(3)
    expect(list.reorderable).toBe(false)
  })

  it('adjusts the chrome index only when moving later in the same folder', () => {
    expect(chromeMoveIndex(0, 2, true)).toBe(3)
    expect(chromeMoveIndex(3, 1, true)).toBe(1)
    expect(chromeMoveIndex(0, 2, false)).toBe(2)
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
})
