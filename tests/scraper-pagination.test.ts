import { describe, expect, it } from 'vitest'

import { findPaginationCandidates } from '@/core/scraper'

describe('scraper pagination', () => {
  it('ranks rel=next highest', () => {
    document.body.innerHTML = `
      <a href="/p1">Prev</a>
      <a rel="next" href="/p2">Next</a>
      <a class="disabled" aria-disabled="true">Next</a>
    `
    const list = findPaginationCandidates(document)
    expect(list[0]?.element.getAttribute('rel')).toContain('next')
  })
})
