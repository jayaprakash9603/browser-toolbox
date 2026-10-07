import { describe, expect, it } from 'vitest'

import {
  cssAbsoluteSelector,
  cssAttributeSelector,
  cssClassSelector,
  cssEscape,
  cssIdSelector,
  cssRelativeSelector,
  describeElement,
  generateSelectors,
  xpathAbsolute,
  xpathByClass,
  xpathById,
  xpathByText,
  xpathRelative,
  type ElementDescriptor,
} from '@/core/engines/selector'

const button: ElementDescriptor = {
  tag: 'button',
  id: 'submit',
  classes: ['btn', 'btn-primary'],
  attributes: { type: 'submit', 'data-testid': 'submit-form' },
  text: '  Save   changes ',
  parentChain: [
    { tag: 'form', id: 'editor', classes: ['form'] },
    { tag: 'main', id: '', classes: [] },
    { tag: 'body', id: '', classes: [] },
  ],
  indexAmongSiblings: 2,
}

const plain: ElementDescriptor = {
  tag: 'li',
  id: '',
  classes: [],
  attributes: {},
  text: '',
  parentChain: [
    { tag: 'ul', id: '', classes: ['nav'] },
    { tag: 'body', id: '', classes: [] },
  ],
  indexAmongSiblings: 3,
}

describe('selector engine — css', () => {
  it('builds id, class and attribute selectors', () => {
    expect(cssIdSelector(button)).toBe('#submit')
    expect(cssClassSelector(button)).toBe('button.btn.btn-primary')
    expect(cssAttributeSelector(button)).toBe('button[data-testid="submit-form"]')
  })

  it('returns null when a strategy does not apply', () => {
    expect(cssIdSelector(plain)).toBeNull()
    expect(cssClassSelector(plain)).toBeNull()
    expect(cssAttributeSelector(plain)).toBeNull()
  })

  it('escapes non-identifier class names', () => {
    expect(cssEscape('w-[10px]')).toBe('w-\\[10px\\]')
    expect(cssEscape('normal-class')).toBe('normal-class')
  })

  it('anchors relative css at the nearest parent with an id', () => {
    const noId = { ...button, id: '' }
    expect(cssRelativeSelector(noId)).toBe('#editor > button.btn')
  })

  it('short-circuits when the element has its own id', () => {
    expect(cssRelativeSelector(button)).toBe('#submit')
  })

  it('falls back to class or nth chain without ids', () => {
    expect(cssRelativeSelector(plain)).toContain('ul.nav')
    expect(cssRelativeSelector(plain)).toContain('li:nth-of-type(3)')
  })

  it('builds an absolute css path from html', () => {
    const noId = { ...button, id: '' }
    const selector = cssAbsoluteSelector(noId)
    expect(selector.startsWith('html >')).toBe(true)
    expect(selector).toContain('#editor')
    expect(selector.endsWith('button.btn')).toBe(true)
  })
})

describe('selector engine — xpath', () => {
  it('builds id, class, attribute and text xpaths', () => {
    expect(xpathById(button)).toBe('//*[@id="submit"]')
    expect(xpathByClass(button)).toBe('//button[contains(concat(" ", normalize-space(@class), " "), " btn ")]')
    expect(xpathByText(button)).toBe('//button[contains(normalize-space(.), "Save changes")]')
  })

  it('builds relative xpath anchored at a parent id', () => {
    const noId = { ...button, id: '' }
    expect(xpathRelative(noId)).toBe('//form[@id="editor"]//button[2]')
    expect(xpathRelative(button)).toBe('//*[@id="submit"]')
  })

  it('builds absolute xpath with position', () => {
    expect(xpathAbsolute(plain)).toBe('/body/ul/li[3]')
  })

  it('returns null text xpath for empty or tiny text', () => {
    expect(xpathByText(plain)).toBeNull()
    expect(xpathByText({ ...plain, text: 'ab' })).toBeNull()
  })

  it('generates the full selector set', () => {
    const selectors = generateSelectors(button)
    expect(selectors.cssId).toBe('#submit')
    expect(selectors.xpathId).toBe('//*[@id="submit"]')
    expect(selectors.cssRelative).toBeTruthy()
    expect(selectors.xpathAbsolute).toBeTruthy()
  })
})

describe('selector engine — describeElement', () => {
  it('captures a real DOM element', () => {
    document.body.innerHTML = '<main id="app"><form class="f"><button type="submit" data-testid="go">Go now</button></form></main>'
    const element = document.querySelector('button')!
    const captured = describeElement(element, window.getComputedStyle(element))
    expect(captured.tag).toBe('button')
    expect(captured.attributes['data-testid']).toBe('go')
    expect(captured.parentChain[0]).toMatchObject({ tag: 'form', classes: ['f'] })
    expect(captured.parentChain[1].id).toBe('app')
    expect(captured.indexAmongSiblings).toBe(1)
    expect(captured.text).toContain('Go now')
  })
})
