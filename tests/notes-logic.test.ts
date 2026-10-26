import { describe, expect, it } from 'vitest'

import {
  checklistProgress,
  extractTags,
  filterNotes,
  groupNotes,
  highlightParts,
  notesCounts,
  DEFAULT_FILTER,
} from '@/tools/productivity/notes/notesLogic'
import { normalizeNote, purgeExpiredTrash, TRASH_RETENTION_MS, type Note } from '@/tools/productivity/notes/notesService'
import { templateNote } from '@/tools/productivity/notes/templates'

const DAY = 24 * 60 * 60 * 1000

function note(partial: Partial<Note>): Note {
  return normalizeNote({ title: '', body: '', updatedAt: 1, ...partial })
}

describe('extractTags', () => {
  it('reads #tags but skips headings, URL fragments, numbers and code', () => {
    const text = '# Heading\nship #Work today, (#home)\nhttps://x.dev/page#top #42\n`#notag`\n```\n#inside\n```'
    expect(extractTags(text)).toEqual(['work', 'home'])
  })
})

describe('checklistProgress', () => {
  it('counts done and open items', () => {
    expect(checklistProgress('- [x] a\n- [ ] b\n  - [X] c\n- d')).toEqual({ done: 2, total: 3 })
  })
})

describe('views and filters', () => {
  const notes = [
    note({ id: 'a', title: 'Plan', body: '#work\n- [ ] ship', pinned: true, updatedAt: 5 }),
    note({ id: 'b', title: 'Old', body: 'done', archived: true, updatedAt: 4 }),
    note({ id: 'c', title: 'Gone', body: '#work', trashedAt: 10, updatedAt: 3 }),
    note({ id: 'd', title: 'Shop', body: 'milk #home', color: 'yellow', updatedAt: 2 }),
  ]

  it('counts each view and tag over live notes only', () => {
    const counts = notesCounts(notes)
    expect(counts.views).toEqual({ all: 2, pinned: 1, checklists: 1, archive: 1, trash: 1 })
    expect(counts.tags).toEqual([
      { tag: 'home', count: 1 },
      { tag: 'work', count: 1 },
    ])
  })

  it('filters by view, tag, color and query (including #tag queries)', () => {
    const ids = (filter: Partial<typeof DEFAULT_FILTER>) =>
      filterNotes(notes, { ...DEFAULT_FILTER, ...filter }, 'modified').map((n) => n.id)
    expect(ids({})).toEqual(['a', 'd'])
    expect(ids({ view: 'trash' })).toEqual(['c'])
    expect(ids({ tag: 'home' })).toEqual(['d'])
    expect(ids({ color: 'yellow' })).toEqual(['d'])
    expect(ids({ query: '#wo' })).toEqual(['a'])
    expect(ids({ query: 'MILK shop' })).toEqual(['d'])
  })

  it('groups pinned notes first, then by date', () => {
    const now = new Date(2026, 9, 26, 12).getTime()
    const sorted = [
      note({ id: 'p', pinned: true, updatedAt: now - 40 * DAY }),
      note({ id: 't', updatedAt: now - 60_000 }),
      note({ id: 'y', updatedAt: now - DAY }),
      note({ id: 'o', updatedAt: now - 90 * DAY }),
    ]
    const sections = groupNotes(sorted, { sort: 'modified', grouped: true, view: 'all', now })
    expect(sections.map((s) => [s.id, s.notes.map((n) => n.id)])).toEqual([
      ['pinned', ['p']],
      ['today', ['t']],
      ['yesterday', ['y']],
      ['older', ['o']],
    ])
    expect(groupNotes(sorted, { sort: 'title', grouped: true, view: 'all', now }).map((s) => s.id)).toEqual(['pinned', 'notes'])
  })
})

describe('highlightParts', () => {
  it('marks every query token case-insensitively', () => {
    expect(highlightParts('Buy Milk and milk', 'milk')).toEqual([
      { text: 'Buy ', match: false },
      { text: 'Milk', match: true },
      { text: ' and ', match: false },
      { text: 'milk', match: true },
    ])
  })
})

describe('trash retention', () => {
  it('purges notes trashed more than 30 days ago', () => {
    const now = 100 * DAY
    const kept = purgeExpiredTrash(
      [note({ id: 'live' }), note({ id: 'recent', trashedAt: now - DAY }), note({ id: 'old', trashedAt: now - TRASH_RETENTION_MS })],
      now,
    )
    expect(kept.map((n) => n.id)).toEqual(['live', 'recent'])
  })
})

describe('templates', () => {
  const t = (key: string, options?: Record<string, unknown>) => (options?.date ? `${key}:${String(options.date)}` : key)

  it('builds a checklist and a linked page note', () => {
    expect(templateNote('checklist', t).body).toBe('- [ ] ')
    expect(templateNote('page', t, { page: { title: 'Docs [v2]', url: 'https://example.com' } })).toEqual({
      title: 'Docs [v2]',
      body: '[Docs v2](https://example.com)\n\n',
    })
  })
})
