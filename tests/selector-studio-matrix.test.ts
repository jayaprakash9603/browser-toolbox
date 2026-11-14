import { describe, expect, it } from 'vitest'

import { generateCandidates } from '@/core/engines/selector-studio/generate'
import { filterLocatorGroup } from '@/core/engines/selector-studio/locatorGroups'
import { matchBadgeState } from '@/core/engines/selector-studio/matchStatus'
import type { SelectorCandidate, SelectorSnapshot } from '@/core/engines/selector-studio/types'
import { applyEvaluation } from '@/core/engines/selector-studio/validate'

function snap(partial: Partial<SelectorSnapshot> & Pick<SelectorSnapshot, 'tag'>): SelectorSnapshot {
  return {
    id: '',
    classes: [],
    attributes: {},
    text: '',
    ownText: '',
    parentChain: [],
    indexAmongSameTag: 1,
    indexAmongSiblings: 1,
    label: null,
    previousSibling: null,
    nextSibling: null,
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    isSvg: false,
    connected: true,
    shadowHosts: [],
    frame: { url: 'https://example.com', sameOrigin: true, isTop: true },
    identityPath: '/html/body/button[1]',
    idUnique: null,
    testIdUnique: null,
    pageUrl: 'https://example.com',
    ...partial,
  }
}

const checkoutButton = snap({
  tag: 'button',
  id: 'checkout',
  idUnique: true,
  classes: ['primary', 'cta'],
  attributes: { 'data-testid': 'checkout', type: 'submit', role: 'button', 'aria-label': 'Pay now' },
  text: 'Pay now',
  ownText: 'Pay now',
  parentChain: [
    {
      tag: 'form',
      id: 'cart',
      classes: ['checkout-form'],
      attributes: { action: '/pay' },
      indexAmongSameTag: 1,
      indexAmongSiblings: 1,
    },
  ],
})

/** High-level acceptance matrix for the SelectorHub-style engine. */
describe('selector-studio acceptance matrix', () => {
  const generated = generateCandidates(checkoutButton, 'stable', { includeAxes: true })

  it('01 produces CSS and XPath strategies', () => {
    expect(generated.some((item) => item.kind === 'css')).toBe(true)
    expect(generated.some((item) => item.kind === 'xpath')).toBe(true)
  })

  it('02 ranks test id and id locators', () => {
    expect(generated[0]?.strategy === 'test-attribute' || generated[0]?.strategy === 'id').toBe(true)
  })

  it('03 includes parent / axis strategies when enabled', () => {
    expect(generated.some((item) => item.strategy === 'parent-child' || item.strategy === 'ancestor')).toBe(
      true,
    )
  })

  it('04 appends jQuery utility rows', () => {
    expect(generated.some((item) => item.reasons.includes('jQuery'))).toBe(true)
  })

  it('05 appends Playwright utility rows', () => {
    expect(generated.some((item) => item.reasons.includes('Playwright'))).toBe(true)
  })

  it('06 appends indexed XPath utility rows', () => {
    expect(generated.some((item) => item.reasons.includes('index XPath'))).toBe(true)
  })

  it('07 filters recommended unique verified locators', () => {
    const verified: SelectorCandidate = {
      ...generated[0]!,
      uniqueness: 'unique',
      matchCount: 1,
      intendedMatched: true,
      syntaxValid: true,
    }
    const noisy: SelectorCandidate = {
      ...generated[0]!,
      id: 'noisy',
      uniqueness: 'multiple',
      matchCount: 4,
      intendedMatched: true,
      syntaxValid: true,
    }
    expect(filterLocatorGroup([verified, noisy], 'recommended')).toHaveLength(1)
  })

  it('08 filters XPath-only preset', () => {
    expect(filterLocatorGroup(generated, 'xpath').every((item) => item.kind === 'xpath')).toBe(true)
  })

  it('09 filters CSS-only preset', () => {
    expect(filterLocatorGroup(generated, 'css').every((item) => item.kind === 'css')).toBe(true)
  })

  it('10 groups framework utilities (jQuery, Playwright, index)', () => {
    const framework = filterLocatorGroup(generated, 'jquery')
    expect(
      framework.some(
        (item) =>
          item.reasons.includes('jQuery') ||
          item.reasons.includes('Playwright') ||
          item.reasons.includes('index XPath'),
      ),
    ).toBe(true)
  })

  it('11 maps live evaluation to unique badge', () => {
    const base = generated[0]!
    const evaluated = applyEvaluation(base, {
      syntaxValid: true,
      matchCount: 1,
      intendedMatched: true,
    })
    expect(matchBadgeState(evaluated).tone).toBe('unique')
    expect(matchBadgeState(evaluated).shortLabel).toBe('1')
  })

  it('12 maps zero matches to none badge', () => {
    const evaluated = applyEvaluation(generated[0]!, {
      syntaxValid: true,
      matchCount: 0,
      intendedMatched: false,
    })
    expect(matchBadgeState(evaluated).tone).toBe('none')
  })

  it('13 maps wrong-element matches to wrong badge', () => {
    const evaluated = applyEvaluation(generated[0]!, {
      syntaxValid: true,
      matchCount: 2,
      intendedMatched: false,
    })
    expect(matchBadgeState(evaluated).tone).toBe('wrong')
  })

  it('14 omits axis strategies when includeAxes is false', () => {
    const without = generateCandidates(checkoutButton, 'stable', { includeAxes: false })
    expect(without.every((item) => !['parent-child', 'sibling', 'ancestor'].includes(item.strategy))).toBe(
      true,
    )
  })

  it('15 keeps evaluateAs for display-only Playwright rows', () => {
    const pw = generated.find((item) => item.reasons.includes('Playwright') && item.evaluateAs)
    expect(pw?.evaluateAs?.kind).toBeTruthy()
  })
})