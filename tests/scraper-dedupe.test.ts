import { describe, expect, it } from 'vitest'

import { dedupeRows } from '@/core/scraper'

describe('scraper dedupe', () => {
  it('drops duplicate rows', () => {
    const a = [{ x: '1' }, { x: '2' }]
    const b = dedupeRows(a, [{ x: '2' }, { x: '3' }])
    expect(b).toHaveLength(3)
  })
})
