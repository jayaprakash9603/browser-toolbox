import { describe, expect, it } from 'vitest'

import { mapLinksToPdfPages } from '@/core/screenshot/export/canvas'

describe('mapLinksToPdfPages', () => {
  it('assigns links to page index by vertical offset', () => {
    const links = [{ href: 'https://a', x: 1, y: 1500, width: 10, height: 10 }]
    const mapped = mapLinksToPdfPages(links, [1000, 1000], 1)
    expect(mapped[0]?.pageIndex).toBe(1)
  })
})
