import { describe, expect, it } from 'vitest'

import { generateSelectors, type CapturedElement } from '@/core/engines/selector'
import {
  a11yOf,
  boxModelOf,
  contrastOf,
  issuesOf,
  locatorsOf,
  occupancyPct,
  parseBoxSides,
  reportMarkdown,
} from '@/core/engines/selector/inspect'

function captured(partial: Partial<CapturedElement> & Pick<CapturedElement, 'tag'>): CapturedElement {
  return {
    id: '',
    classes: [],
    attributes: {},
    text: '',
    parentChain: [],
    indexAmongSiblings: 1,
    html: '<div></div>',
    dimensions: { width: 100, height: 40, x: 10, y: 20 },
    computedStyles: {},
    childCount: 0,
    viewport: { width: 1000, height: 800 },
    ...partial,
  }
}

describe('selector inspect — box model', () => {
  it('expands CSS shorthand into four sides', () => {
    expect(parseBoxSides('10px')).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
    expect(parseBoxSides('8px 4px')).toEqual({ top: 8, right: 4, bottom: 8, left: 4 })
    expect(parseBoxSides('1px 2px 3px 4px')).toEqual({ top: 1, right: 2, bottom: 3, left: 4 })
    expect(parseBoxSides('1px solid rgb(0, 0, 0)')).toEqual({ top: 1, right: 1, bottom: 1, left: 1 })
    expect(parseBoxSides(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('reads margin, padding and border from computed styles', () => {
    const box = boxModelOf(
      captured({
        tag: 'button',
        computedStyles: { margin: '8px', padding: '6px 12px', border: '1px solid black' },
        dimensions: { width: 80, height: 32, x: 0, y: 0 },
      }),
    )
    expect(box.margin.top).toBe(8)
    expect(box.padding.left).toBe(12)
    expect(box.border.top).toBe(1)
    expect(box.content).toEqual({ width: 80, height: 32 })
  })
})

describe('selector inspect — contrast and a11y', () => {
  it('computes contrast for opaque colors and skips transparent backgrounds', () => {
    const opaque = captured({
      tag: 'p',
      computedStyles: { color: 'rgb(0, 0, 0)', 'background-color': 'rgb(255, 255, 255)' },
    })
    const contrast = contrastOf(opaque)
    expect(contrast?.ratio).toBe(21)
    expect(contrast?.aaNormal).toBe(true)

    const clear = captured({
      tag: 'p',
      computedStyles: { color: 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)' },
    })
    expect(contrastOf(clear)).toBeNull()
  })

  it('flags unnamed interactive controls and missing image alt', () => {
    const button = captured({ tag: 'button', text: '', attributes: {} })
    const a11y = a11yOf(button)
    expect(a11y.interactive).toBe(true)
    expect(a11y.labelled).toBe(false)
    expect(issuesOf(button, null).some((issue) => issue.id === 'name')).toBe(true)

    const img = captured({ tag: 'img', attributes: { src: 'x.png' } })
    expect(issuesOf(img, null).some((issue) => issue.id === 'alt')).toBe(true)
  })

  it('builds test locators and a markdown report', () => {
    const element = captured({
      tag: 'button',
      id: 'save',
      text: 'Save',
      computedStyles: { display: 'inline-flex', position: 'relative' },
    })
    const selectors = generateSelectors(element)
    const locators = locatorsOf(element, selectors)
    expect(locators.playwright).toContain('page.locator')
    expect(locators.cypress).toContain('cy.get')
    expect(locators.testingLibrary).toContain('getByRole')
    expect(reportMarkdown(element, selectors, null)).toContain('<button>#save')
  })

  it('computes occupancy against the captured viewport', () => {
    const element = captured({
      tag: 'div',
      dimensions: { width: 100, height: 80, x: 0, y: 0 },
      viewport: { width: 1000, height: 800 },
    })
    expect(occupancyPct(element)).toBe(1)
  })
})
