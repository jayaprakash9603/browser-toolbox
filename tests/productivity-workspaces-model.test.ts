import { describe, expect, it } from 'vitest'

import { filterWorkspaces, type TabWorkspace } from '@/tools/productivity/workspaces/model'

const sample: TabWorkspace[] = [
  {
    id: '1',
    name: 'Research sprint',
    note: 'docs only',
    tabs: [{ url: 'https://example.com', title: 'Example' }],
    createdAt: 1,
    updatedAt: 2,
  },
  {
    id: '2',
    name: 'Shopping',
    tabs: [{ url: 'https://shop.test', title: 'Shop' }],
    createdAt: 1,
    updatedAt: 1,
  },
]

describe('filterWorkspaces', () => {
  it('returns all when query empty', () => {
    expect(filterWorkspaces(sample, '')).toHaveLength(2)
  })

  it('matches name, note, and tab fields', () => {
    expect(filterWorkspaces(sample, 'research')).toHaveLength(1)
    expect(filterWorkspaces(sample, 'docs')).toHaveLength(1)
    expect(filterWorkspaces(sample, 'shop.test')).toHaveLength(1)
  })
})
