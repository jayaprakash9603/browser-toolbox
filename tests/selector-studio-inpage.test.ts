import { describe, expect, it } from 'vitest'

import {
  clearSelectorHighlights,
  evaluateSelectorsInPage,
  highlightSelectorMatches,
} from '@/core/engines/selector-studio/inPage'

describe('selector-studio in-page evaluation', () => {
  it('counts unique, multiple, and zero CSS matches', () => {
    document.body.innerHTML = `
      <button id="one" data-testid="go">A</button>
      <button class="many">B</button>
      <button class="many">C</button>`
    const results = evaluateSelectorsInPage(
      [
        { kind: 'css', expression: '#one' },
        { kind: 'css', expression: '.many' },
        { kind: 'css', expression: '#missing' },
        { kind: 'css', expression: '[[' },
      ],
      '/html/body/button[1]',
    )
    expect(results[0]).toMatchObject({ syntaxValid: true, matchCount: 1 })
    expect(results[1]).toMatchObject({ syntaxValid: true, matchCount: 2 })
    expect(results[2]).toMatchObject({ syntaxValid: true, matchCount: 0 })
    expect(results[3]?.syntaxValid).toBe(false)
  })

  it('evaluates XPath when the document supports it', () => {
    document.body.innerHTML = '<main><button id="go">Go</button></main>'
    if (typeof document.evaluate !== 'function') return
    const [ok, bad] = evaluateSelectorsInPage(
      [
        { kind: 'xpath', expression: '//*[@id="go"]' },
        { kind: 'xpath', expression: '//[' },
      ],
      '/html/body/main[1]/button[1]',
    )
    expect(ok.syntaxValid).toBe(true)
    expect(ok.matchCount).toBe(1)
    expect(bad.syntaxValid).toBe(false)
  })

  it('draws and clears an isolated highlight overlay', () => {
    document.body.innerHTML = '<button id="go">Go</button>'
    const result = highlightSelectorMatches('css', '#go', null)
    expect(result.count).toBe(1)
    expect(document.getElementById('toolbox-selector-studio-highlights')).toBeTruthy()
    clearSelectorHighlights()
    expect(document.getElementById('toolbox-selector-studio-highlights')).toBeNull()
  })
})
