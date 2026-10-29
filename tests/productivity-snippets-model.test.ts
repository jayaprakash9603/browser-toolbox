import { describe, expect, it } from 'vitest'

import {
  duplicateSnippet,
  extractCustomVariables,
  filterSnippets,
  mergeImportedSnippets,
  parseSnippetTags,
  recordSnippetUse,
  resolveSnippetBody,
  snippetStats,
  sortSnippets,
  type Snippet,
} from '@/tools/productivity/snippets/model'

const sample = (overrides: Partial<Snippet> = {}): Snippet => ({
  id: 'a',
  title: 'Hello',
  body: 'Line one\nLine two',
  category: 'Email',
  tags: [],
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
})

describe('snippets model', () => {
  it('filters by category and query', () => {
    const list = [sample(), sample({ id: 'b', title: 'Other', category: 'Code', body: 'xyz' })]
    expect(filterSnippets(list, 'hello', 'all')).toHaveLength(1)
    expect(filterSnippets(list, '', 'Code')).toHaveLength(1)
  })

  it('sorts pinned first then by title', () => {
    const list = [
      sample({ id: 'b', title: 'Beta', pinned: false }),
      sample({ id: 'a', title: 'Alpha', pinned: true }),
    ]
    const sorted = sortSnippets(list, 'title')
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('duplicates with a new id', () => {
    const copy = duplicateSnippet(sample())
    expect(copy.id).not.toBe('a')
    expect(copy.title).toContain('copy')
    expect(copy.pinned).toBe(false)
  })

  it('merges imports without clobbering ids', () => {
    const merged = mergeImportedSnippets([sample()], [sample({ id: 'a', title: 'Dup' })])
    expect(merged).toHaveLength(2)
    expect(merged[1].title).toBe('Dup')
  })

  it('counts snippet stats', () => {
    expect(snippetStats('one two\nthree')).toEqual({ words: 3, chars: 13, lines: 2 })
  })

  it('resolves built-in and custom variables, leaving unknown tokens intact', () => {
    const body = 'Hi {{name}}, see {{url}} on {{date}} {{missing}}'
    const out = resolveSnippetBody(
      body,
      { name: 'Dana' },
      { url: 'https://a.test', now: new Date('2026-01-02T10:00:00Z') },
    )
    expect(out).toContain('Hi Dana')
    expect(out).toContain('https://a.test')
    expect(out).toContain('2026-01-02')
    expect(out).toContain('{{missing}}')
  })

  it('lists only custom variables for the fill dialog', () => {
    expect(extractCustomVariables('{{date}} {{name}} {{name}} {{topic}}')).toEqual([
      'name',
      'topic',
    ])
  })

  it('parses tags, filters by tag and shortcut, and tracks usage', () => {
    expect(parseSnippetTags('#Email, follow-up  email')).toEqual(['email', 'follow-up'])
    const list = [sample({ tags: ['email'], shortcut: '/hi' }), sample({ id: 'b', tags: [] })]
    expect(filterSnippets(list, '', 'all', 'email')).toHaveLength(1)
    expect(filterSnippets(list, '/hi', 'all')).toHaveLength(1)
    expect(recordSnippetUse(list, 'a')[0].useCount).toBe(1)
  })

  it('sorts by popularity after pinned', () => {
    const list = [sample({ id: 'x', useCount: 1 }), sample({ id: 'y', useCount: 9 })]
    expect(sortSnippets(list, 'popular').map((s) => s.id)).toEqual(['y', 'x'])
  })
})
