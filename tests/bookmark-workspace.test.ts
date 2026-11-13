import { describe, expect, it } from 'vitest'

import {
  applyItemFields,
  assignCollection,
  buildImportPreview,
  canonicalizeBookmarkUrl,
  classifyHealthResult,
  duplicateReviewGroups,
  emptyWorkspace,
  filterWorkspaceRows,
  mergeDuplicateMeta,
  organizePreview,
  parseBookmarkCsv,
  parseBookmarkJson,
  parseBookmarkWorkspace,
  parseNetscapeHtml,
  recordAccess,
  suggestCollectionId,
  upsertItem,
} from '@/core/bookmarks'
import { duplicateBookmarkIds, normalizeBookmarkUrl, parseBookmarkTree } from '@/tools/productivity/bookmarks/service'
import { deriveBookmarkList } from '@/tools/productivity/bookmarks/bookmarkList'

const rows = [
  { id: '1', title: 'React docs', url: 'https://react.dev/learn', folderPath: 'Dev', dateAdded: Date.now() },
  { id: '2', title: 'React docs copy', url: 'https://react.dev/learn?utm_source=x', folderPath: 'Read', dateAdded: 1 },
  { id: '3', title: 'Figma file', url: 'https://www.figma.com/file/abc', folderPath: 'Design', dateAdded: Date.now() },
]

describe('bookmark workspace overlay', () => {
  it('parses empty storage into seeded collections', () => {
    const workspace = parseBookmarkWorkspace(undefined)
    expect(workspace.collections.development?.name).toBe('Development')
    expect(workspace.prefs.nav).toBe('all')
  })

  it('canonicalizes tracking parameters as duplicates', () => {
    expect(canonicalizeBookmarkUrl(rows[0].url)).toBe(canonicalizeBookmarkUrl(rows[1].url))
    expect([...duplicateBookmarkIds(rows)].sort()).toEqual(['1', '2'])
  })

  it('keeps existing hash and slash duplicate detection', () => {
    expect(normalizeBookmarkUrl('https://www.a.com/x/')).toBe(normalizeBookmarkUrl('https://a.com/x#top'))
  })

  it('builds duplicate review groups', () => {
    const groups = duplicateReviewGroups(rows)
    expect(groups.some((group) => group.rows.length >= 2)).toBe(true)
  })

  it('filters overlay search across notes and tags', () => {
    let workspace = emptyWorkspace()
    workspace = upsertItem(workspace, '1', { notes: 'hooks primer', tagIds: [] })
    const found = filterWorkspaceRows(rows, workspace, {
      query: 'hooks',
      nav: 'all',
      folderId: 'all',
      domain: 'all',
      collectionId: 'all',
      projectId: 'all',
      tagIds: [],
      readingStatus: 'all',
      chips: [],
    }, new Set())
    expect(found.map((row) => row.id)).toEqual(['1'])
  })

  it('suggests design collection for figma', () => {
    const workspace = parseBookmarkWorkspace(undefined)
    expect(suggestCollectionId(rows[2], workspace)).toBe('design')
  })

  it('classifies health results', () => {
    expect(classifyHealthResult({ href: 'https://x.test', text: '', status: 404, ok: false })).toBe('broken')
    expect(classifyHealthResult({ href: 'https://x.test', text: '', status: 401, ok: false })).toBe('auth')
    expect(classifyHealthResult({ href: 'https://x.test', text: '', status: null, timedOut: true, ok: false })).toBe(
      'timeout',
    )
    expect(classifyHealthResult({ href: 'not-a-url', text: '', status: null, ok: false })).toBe('invalid')
  })

  it('parses csv json and netscape import', () => {
    const csv = parseBookmarkCsv('title,url,folder\nDocs,https://d.test,Work\n')
    expect(csv[0]).toMatchObject({ title: 'Docs', url: 'https://d.test', folderPath: 'Work' })
    expect(parseBookmarkJson([{ title: 'A', url: 'https://a.test' }])[0].url).toBe('https://a.test')
    const html = parseNetscapeHtml(
      `<DL><p><DT><H3>Work</H3>\n<DL><p><DT><A HREF="https://n.test">Nested</A>\n</DL><p>`,
    )
    expect(html[0].title).toBe('Nested')
    const preview = buildImportPreview(csv, rows)
    expect(preview.bookmarks).toHaveLength(1)
  })

  it('organize preview suggests collections for uncategorized rows', () => {
    const library = { rows, folders: [] }
    const suggestions = organizePreview(library, parseBookmarkWorkspace(undefined))
    expect(suggestions.some((item) => item.kind === 'collection')).toBe(true)
  })

  it('still derives folder browse lists', () => {
    const tree = parseBookmarkTree([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bar',
            parentId: '0',
            children: [{ id: '3', title: 'Docs', url: 'https://d.test', parentId: '1', index: 0 }],
          },
        ],
      },
    ] as chrome.bookmarks.BookmarkTreeNode[])
    const list = deriveBookmarkList(tree, {
      query: '',
      folderId: '1',
      domain: 'all',
      view: 'all',
      sort: 'manual',
    })
    expect(list.browsing).toBe(true)
    expect(list.rows).toHaveLength(1)
  })

  it('assigns collections without rewriting chrome titles', () => {
    let workspace = parseBookmarkWorkspace(undefined)
    workspace = assignCollection(workspace, '1', 'development', true)
    expect(workspace.collections.development.bookmarkIds).toContain('1')
    expect(workspace.items['1'].collectionIds).toContain('development')
  })

  it('merges overlay notes and tags onto the keeper', () => {
    let workspace = emptyWorkspace()
    workspace = upsertItem(workspace, '1', { notes: 'keep', tagIds: ['a'] })
    workspace = upsertItem(workspace, '2', { notes: 'drop', tagIds: ['b'] })
    const merged = mergeDuplicateMeta(workspace, '1', '2')
    expect(merged.items['1'].notes).toContain('keep')
    expect(merged.items['1'].notes).toContain('drop')
    expect(merged.items['1'].tagIds).toEqual(['a', 'b'])
  })

  it('records access counts only in overlay metadata', () => {
    const next = recordAccess(emptyWorkspace(), '1')
    expect(next.items['1'].accessCount).toBe(1)
    expect(next.items['1'].lastAccessedAt).toBeGreaterThan(0)
  })

  it('writes collection ids through applyItemFields', () => {
    const workspace = applyItemFields(parseBookmarkWorkspace(undefined), '3', {
      collectionIds: ['design'],
      notes: 'brand',
    })
    expect(workspace.items['3'].notes).toBe('brand')
    expect(workspace.collections.design.bookmarkIds).toContain('3')
  })

  it('filters unread and uncategorized chips', () => {
    let workspace = emptyWorkspace()
    workspace = upsertItem(workspace, '1', { readingStatus: 'unread' })
    workspace = upsertItem(workspace, '3', { collectionIds: ['design'] })
    const unread = filterWorkspaceRows(rows, workspace, {
      query: '',
      nav: 'all',
      folderId: 'all',
      domain: 'all',
      collectionId: 'all',
      projectId: 'all',
      tagIds: [],
      readingStatus: 'all',
      chips: ['unread'],
    }, new Set())
    expect(unread.map((row) => row.id)).toEqual(['1'])
  })
})
