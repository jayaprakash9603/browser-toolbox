import { describe, expect, it } from 'vitest'

import {
  duplicateSnippet,
  filterSnippets,
  mergeImportedSnippets,
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
})
