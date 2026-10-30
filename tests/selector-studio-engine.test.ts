import { describe, expect, it } from 'vitest'

import { captureSelectorSnapshot } from '@/core/engines/selector-studio/capture'
import { captureElementInspect } from '@/core/engines/selector-studio/inspect'
import { escapeCssIdent, xpathLiteral } from '@/core/engines/selector-studio/escape'
import { frameworkSnippets } from '@/core/engines/selector-studio/frameworks'
import { bestCandidate, generateCandidates } from '@/core/engines/selector-studio/generate'
import { applyScores, rankCandidates, uniquenessOf } from '@/core/engines/selector-studio/score'
import { isGeneratedClass, looksStableId } from '@/core/engines/selector-studio/stability'
import type { SelectorCandidate, SelectorSnapshot } from '@/core/engines/selector-studio/types'
import { applyEvaluation } from '@/core/engines/selector-studio/validate'
import { generateXPathCandidates } from '@/core/engines/selector-studio/xpath'
import { generateCssCandidates } from '@/core/engines/selector-studio/css'

function snapshot(partial: Partial<SelectorSnapshot> & Pick<SelectorSnapshot, 'tag'>): SelectorSnapshot {
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

function candidate(partial: Partial<SelectorCandidate> & Pick<SelectorCandidate, 'expression'>): SelectorCandidate {
  return {
    id: partial.id ?? `css:id:${partial.expression}`,
    kind: 'css',
    strategy: 'attribute',
    context: 'browser',
    uniqueness: 'unknown',
    matchCount: null,
    intendedMatched: null,
    syntaxValid: null,
    score: 0,
    reasons: [],
    warnings: [],
    ...partial,
  }
}

describe('selector-studio escape', () => {
  it('builds XPath literals for quotes, apostrophes, and mixed quotes', () => {
    expect(xpathLiteral('Submit')).toBe('"Submit"')
    expect(xpathLiteral(`It's`)).toBe(`"It's"`)
    expect(xpathLiteral('Say "hi"')).toBe(`'Say "hi"'`)
    expect(xpathLiteral(`Say "hi" it's`)).toBe(`concat('Say "hi" it', "'s")`)
  })

  it('escapes CSS identifiers including Tailwind arbitrary values', () => {
    expect(escapeCssIdent('normal-class')).toMatch(/normal-class/)
    expect(escapeCssIdent('w-[10px]')).toContain('\\')
  })
})

describe('selector-studio stability', () => {
  it('flags generated and hashed class names', () => {
    expect(isGeneratedClass('btn')).toBe(false)
    expect(isGeneratedClass('w-[10px]')).toBe(true)
    expect(isGeneratedClass('css-1a2b3c')).toBe(true)
    expect(isGeneratedClass('Button_xY12z')).toBe(true)
  })

  it('rejects uuid-like ids as unstable', () => {
    expect(looksStableId('login-button')).toBe(true)
    expect(looksStableId('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
  })
})

describe('selector-studio generation', () => {
  const button = snapshot({
    tag: 'button',
    id: 'login-button',
    idUnique: true,
    classes: ['primary', 'css-1abcde'],
    attributes: { type: 'submit', 'data-testid': 'submit', name: 'commit' },
    testIdUnique: true,
    text: 'Submit order',
    ownText: 'Submit order',
    parentChain: [
      {
        tag: 'form',
        id: 'login-form',
        classes: [],
        attributes: { 'data-testid': 'login-form' },
        indexAmongSameTag: 1,
        indexAmongSiblings: 1,
      },
      {
        tag: 'main',
        id: '',
        classes: [],
        attributes: { 'aria-label': 'Account' },
        indexAmongSameTag: 1,
        indexAmongSiblings: 1,
      },
      {
        tag: 'body',
        id: '',
        classes: [],
        attributes: {},
        indexAmongSameTag: 1,
        indexAmongSiblings: 1,
      },
    ],
  })

  it('generates id, test-attribute, text, class, combined, and relative XPath', () => {
    const xpath = generateXPathCandidates(button)
    expect(xpath.some((item) => item.expression === '//*[@id="login-button"]')).toBe(true)
    expect(xpath.some((item) => item.expression.includes('@data-testid="submit"'))).toBe(true)
    expect(xpath.some((item) => item.expression.includes('normalize-space(.)="Submit order"'))).toBe(true)
    expect(xpath.some((item) => item.expression.includes('concat(" ", normalize-space(@class)'))).toBe(true)
    expect(xpath.some((item) => item.expression.includes('@type="submit" and @name="commit"'))).toBe(true)
    expect(xpath.some((item) => item.strategy === 'relative')).toBe(true)
    expect(xpath.some((item) => item.strategy === 'parent-child')).toBe(true)
    expect(xpath.some((item) => item.strategy === 'structural')).toBe(true)
  })

  it('generates CSS id, class, attribute, compound, descendant, child, and nth strategies', () => {
    const css = generateCssCandidates(button)
    expect(css.some((item) => item.expression === '#login-button')).toBe(true)
    expect(css.some((item) => item.expression.includes('[data-testid="submit"]'))).toBe(true)
    expect(css.some((item) => item.expression.includes('.primary'))).toBe(true)
    expect(css.some((item) => item.strategy === 'nth')).toBe(true)
    expect(css.some((item) => item.strategy === 'relative' || item.strategy === 'ancestor')).toBe(true)
  })

  it('uses class-token matching instead of unsafe class substrings', () => {
    const xpath = generateXPathCandidates(button).find((item) => item.strategy === 'class')
    expect(xpath?.expression).toContain('concat(" ", normalize-space(@class), " ")')
    expect(xpath?.expression).toContain(' primary ')
  })

  it('handles unicode and apostrophes in text XPath', () => {
    const node = snapshot({
      tag: 'button',
      text: `Café "go" it's`,
      ownText: `Café "go" it's`,
    })
    const xpath = generateXPathCandidates(node).find((item) => item.strategy === 'text')
    expect(xpath?.expression).toContain('concat(')
    expect(xpath?.expression).toContain('Café')
  })

  it('generates sibling XPath only when a label relationship exists', () => {
    const input = snapshot({
      tag: 'input',
      attributes: { type: 'email', name: 'email' },
      label: { text: 'Email', relationship: 'preceding-sibling' },
      previousSibling: {
        tag: 'label',
        id: '',
        classes: [],
        attributes: {},
        text: 'Email',
      },
    })
    const xpath = generateXPathCandidates(input)
    expect(xpath.some((item) => item.expression.includes('following-sibling::input'))).toBe(true)

    const lonely = snapshot({ tag: 'input', attributes: { type: 'text' } })
    expect(generateXPathCandidates(lonely).every((item) => item.strategy !== 'sibling')).toBe(true)
  })

  it('marks SVG locators and uses local-name()', () => {
    const path = snapshot({
      tag: 'path',
      isSvg: true,
      namespaceURI: 'http://www.w3.org/2000/svg',
    })
    const xpath = generateXPathCandidates(path)
    expect(xpath.some((item) => item.expression.includes('local-name()="path"'))).toBe(true)
  })

  it('labels shadow and frame limitations instead of claiming a single locator works', () => {
    const shadowed = snapshot({
      tag: 'button',
      attributes: { type: 'button' },
      shadowHosts: [{ tag: 'app-root', id: 'host', classes: [], attributes: {}, mode: 'open' }],
    })
    const framed = snapshot({
      tag: 'button',
      frame: { url: 'https://other.example/frame', sameOrigin: false, isTop: false },
    })
    expect(generateCandidates(shadowed).every((item) => item.context === 'requires-shadow')).toBe(true)
    expect(generateCandidates(framed).every((item) => item.context === 'requires-frame')).toBe(true)
    expect(generateCssCandidates(shadowed).some((item) => item.piercePath?.length)).toBe(true)
  })

  it('handles elements without ids or classes', () => {
    const plain = snapshot({ tag: 'span' })
    const all = generateCandidates(plain)
    expect(all.some((item) => item.strategy === 'structural')).toBe(true)
    expect(all.every((item) => item.expression.length > 0)).toBe(true)
  })
})

describe('selector-studio validation rules', () => {
  it('never labels zero or many matches as unique', () => {
    expect(uniquenessOf(0, true)).toBe('none')
    expect(uniquenessOf(3, true)).toBe('multiple')
    expect(uniquenessOf(1, true)).toBe('unique')
    expect(uniquenessOf(1, false)).toBe('unknown')
  })

  it('applies invalid XPath and CSS results without claiming uniqueness', () => {
    const invalid = applyEvaluation(candidate({ expression: '//[', kind: 'xpath', strategy: 'id' }), {
      syntaxValid: false,
      matchCount: 0,
      error: 'Syntax error',
      intendedMatched: false,
    })
    expect(invalid.syntaxValid).toBe(false)
    expect(invalid.uniqueness).toBe('unknown')

    const empty = applyEvaluation(candidate({ expression: '#missing', strategy: 'id' }), {
      syntaxValid: true,
      matchCount: 0,
      intendedMatched: false,
    })
    expect(empty.uniqueness).toBe('none')

    const many = applyEvaluation(candidate({ expression: 'button', strategy: 'attribute' }), {
      syntaxValid: true,
      matchCount: 4,
      intendedMatched: true,
    })
    expect(many.uniqueness).toBe('multiple')
  })

  it('keeps detached elements from being recommended as unique', () => {
    const detached = snapshot({ tag: 'button', connected: false, id: 'gone', idUnique: true })
    const scored = applyScores(generateCandidates(detached), detached)
    expect(scored.some((item) => item.warnings.some((warning) => /not connected/i.test(warning)))).toBe(true)
  })
})

describe('selector-studio ranking', () => {
  it('prefers a unique test id over a unique generated class', () => {
    const node = snapshot({
      tag: 'button',
      classes: ['css-1a2b3c'],
      attributes: { 'data-testid': 'checkout' },
      testIdUnique: true,
    })
    const generated = applyEvaluation(candidate({ expression: 'button.css-1a2b3c', strategy: 'class' }), {
      syntaxValid: true,
      matchCount: 1,
      intendedMatched: true,
    })
    const testid = applyEvaluation(
      candidate({ expression: 'button[data-testid="checkout"]', strategy: 'test-attribute' }),
      { syntaxValid: true, matchCount: 1, intendedMatched: true },
    )
    const ranked = rankCandidates(applyScores([generated, testid], node), 'stable')
    expect(ranked[0].strategy).toBe('test-attribute')
  })

  it('ranks deterministically for the same snapshot and mode', () => {
    const node = snapshot({
      tag: 'button',
      id: 'ok',
      idUnique: true,
      attributes: { type: 'button', 'data-testid': 'ok' },
      testIdUnique: true,
    })
    const first = generateCandidates(node, 'automation').map((item) => item.expression)
    const second = generateCandidates(node, 'automation').map((item) => item.expression)
    expect(first).toEqual(second)
  })

  it('bestCandidate skips invalid and empty matches', () => {
    const picks = [
      applyEvaluation(candidate({ expression: 'bad', strategy: 'class', kind: 'css' }), {
        syntaxValid: false,
        matchCount: 0,
        intendedMatched: false,
      }),
      applyEvaluation(candidate({ expression: '.gone', strategy: 'class' }), {
        syntaxValid: true,
        matchCount: 0,
        intendedMatched: false,
      }),
      applyEvaluation(candidate({ expression: '[data-testid="ok"]', strategy: 'test-attribute' }), {
        syntaxValid: true,
        matchCount: 1,
        intendedMatched: true,
      }),
    ]
    const node = snapshot({ tag: 'button' })
    expect(bestCandidate(applyScores(picks, node))?.expression).toBe('[data-testid="ok"]')
  })
})

describe('selector-studio frameworks', () => {
  it('emits labeled snippets for each framework from the same analysis', () => {
    const node = snapshot({
      tag: 'button',
      attributes: { 'data-testid': 'submit', role: 'button', 'aria-label': 'Save' },
      testIdUnique: true,
      text: 'Save',
      ownText: 'Save',
    })
    const snippets = frameworkSnippets(node, generateCandidates(node))
    const frameworks = new Set(snippets.map((item) => item.framework))
    expect(frameworks.has('selenium')).toBe(true)
    expect(frameworks.has('playwright')).toBe(true)
    expect(frameworks.has('puppeteer')).toBe(true)
    expect(frameworks.has('cypress')).toBe(true)
    expect(frameworks.has('webdriverio')).toBe(true)
    expect(snippets.find((item) => item.api === 'getByTestId')?.code).toContain('getByTestId("submit")')
    expect(snippets.find((item) => item.framework === 'selenium' && item.api === 'By.XPATH')?.code).toContain(
      'find_element(By.XPATH',
    )
    expect(snippets.find((item) => item.framework === 'puppeteer')?.code).toContain('page.locator')
  })

  it('escapes quotes inside framework output', () => {
    const node = snapshot({
      tag: 'button',
      attributes: { 'data-testid': `it's "fine"` },
      testIdUnique: true,
    })
    const playwright = frameworkSnippets(node, generateCandidates(node)).find((item) => item.api === 'getByTestId')
    expect(playwright?.code).toContain('\\"')
  })
})

describe('selector-studio capture', () => {
  it('captures ancestors, labels, uniqueness, and identity path', () => {
    document.body.innerHTML = `
      <form id="login-form" data-testid="login-form">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" />
      </form>`
    const input = document.querySelector('input')!
    const captured = captureSelectorSnapshot(input)
    expect(captured.tag).toBe('input')
    expect(captured.label?.relationship).toBe('for')
    expect(captured.parentChain[0]?.tag).toBe('form')
    expect(captured.identityPath).toContain('/input[')
    expect(captured.connected).toBe(true)
    expect(captured.frame.isTop).toBe(true)
  })

  it('records open shadow hosts', () => {
    const host = document.createElement('div')
    host.id = 'widget'
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<button type="button">Go</button>'
    document.body.append(host)
    const button = root.querySelector('button')!
    const captured = captureSelectorSnapshot(button)
    expect(captured.shadowHosts[0]?.id).toBe('widget')
    expect(captured.shadowHosts[0]?.mode).toBe('open')
    host.remove()
  })

  it('captures computed styles, matched rules, and attribute listeners', () => {
    document.head.insertAdjacentHTML('beforeend', '<style>.hook{display:flex;color:rgb(0, 0, 0)}</style>')
    document.body.innerHTML = '<button class="hook" style="opacity:0.9" onclick="return false">Go</button>'
    const inspect = captureElementInspect(document.querySelector('button')!)
    expect(inspect.computed.some((item) => item.name === 'display')).toBe(true)
    expect(inspect.inlineStyle).toContain('opacity')
    expect(inspect.classes).toContain('hook')
    expect(inspect.listeners.some((item) => item.type === 'click')).toBe(true)
    expect(inspect.rules.some((rule) => rule.selector.includes('hook'))).toBe(true)
  })
})
