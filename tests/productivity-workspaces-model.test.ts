import { describe, expect, it } from 'vitest'

import {
  dedupeTabs,
  filterWorkspaces,
  mergeImportedWorkspaces,
  sortWorkspaces,
  workspaceToMarkdown,
  type TabWorkspace,
} from '@/tools/productivity/workspaces/model'

const sample: TabWorkspace[] = [
  {
    id: '1',
    name: 'Research sprint',
    note: 'docs only',
    tags: ['research'],
    tabs: [{ url: 'https://example.com', title: 'Example' }],
    createdAt: 1,
    updatedAt: 2,
  },
  {
    id: '2',
    name: 'Shopping',
    pinned: true,
    tabs: [
      { url: 'https://shop.test', title: 'Shop' },
      { url: 'https://shop.test/#cart', title: 'Shop cart' },
    ],
    createdAt: 1,
    updatedAt: 1,
  },
]

describe('filterWorkspaces', () => {
  it('returns all when query empty', () => {
    expect(filterWorkspaces(sample, '')).toHaveLength(2)
  })

  it('matches name, note, tag, and tab fields', () => {
    expect(filterWorkspaces(sample, 'research')).toHaveLength(1)
    expect(filterWorkspaces(sample, 'docs')).toHaveLength(1)
    expect(filterWorkspaces(sample, 'shop.test')).toHaveLength(1)
    expect(filterWorkspaces(sample, '', 'research')).toHaveLength(1)
  })
})

describe('workspace helpers', () => {
  it('sorts pinned sessions first', () => {
    expect(sortWorkspaces(sample, 'recent')[0].id).toBe('2')
  })

  it('removes duplicate urls ignoring hash and trailing slash', () => {
    expect(dedupeTabs(sample[1].tabs)).toHaveLength(1)
  })

  it('exports markdown', () => {
    expect(workspaceToMarkdown(sample[0])).toContain('- [Example](https://example.com)')
  })

  it('merges valid imported sessions only', () => {
    const merged = mergeImportedWorkspaces(sample, [
      { id: '1', name: 'Clash', tabs: [{ url: 'https://new.test' }] },
      { name: 'Empty', tabs: [] },
    ])
    expect(merged).toHaveLength(3)
    expect(new Set(merged.map((w) => w.id)).size).toBe(3)
  })
})
