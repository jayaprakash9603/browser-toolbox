import { describe, expect, it } from 'vitest'

import { detectCandidates } from '@/core/scraper'

describe('scraper detect', () => {
  it('finds table rows', () => {
    document.body.innerHTML = `
      <nav><a>Home</a></nav>
      <table><tbody>
        <tr><td>A</td><td>1</td></tr>
        <tr><td>B</td><td>2</td></tr>
        <tr><td>C</td><td>3</td></tr>
      </tbody></table>
      <footer>foot</footer>
    `
    const list = detectCandidates(document)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].rowCount).toBeGreaterThanOrEqual(2)
  })

  it('finds repeating list items', () => {
    document.body.innerHTML = `
      <ul class="results">
        <li class="item"><a href="/1">One</a></li>
        <li class="item"><a href="/2">Two</a></li>
        <li class="item"><a href="/3">Three</a></li>
      </ul>
    `
    const list = detectCandidates(document)
    expect(list.some((c) => c.rowCount >= 3)).toBe(true)
  })
})
