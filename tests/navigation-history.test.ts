import { describe, expect, it } from 'vitest'

import { getReturnRoute, recordNavigation } from '@/app/navigationHistory'
import { registerModules } from '@/modules'
import { toolRegistry } from '@/core/registry'

registerModules()

describe('navigation history', () => {
  it('returns to the page a tool was opened from', () => {
    recordNavigation('/', '/tools/text/diff')
    expect(getReturnRoute('/tools/text/diff', '/categories/text')).toBe('/')

    recordNavigation('/categories/web', '/tools/web/url-toolkit')
    expect(getReturnRoute('/tools/web/url-toolkit', '/categories/web')).toBe('/categories/web')
  })

  it('falls back when the page was opened directly', () => {
    expect(getReturnRoute('/tools/qa/xpath-tester', '/categories/qa')).toBe('/categories/qa')
  })

  it('keeps the origin of the page the user goes back to', () => {
    recordNavigation('/', '/categories/design')
    recordNavigation('/categories/design', '/tools/design/color-picker')
    recordNavigation('/tools/design/color-picker', '/categories/design')

    expect(getReturnRoute('/categories/design', '/')).toBe('/')
    expect(getReturnRoute('/tools/design/color-picker', '/categories/design')).toBe('/categories/design')
  })

  it('ignores tab switches inside the same workspace', () => {
    const json = toolRegistry.get('developer.json-toolkit')!
    const xml = toolRegistry.get('developer.xml-toolkit')!
    const category = '/categories/develop-qa'

    recordNavigation(category, json.route)
    recordNavigation(json.route, xml.route)

    expect(getReturnRoute(xml.route, category)).toBe(category)
  })

  it('does not loop when a workspace entry redirects to its first tab', () => {
    const studio = toolRegistry.get('design.css-color-studio')!
    const css = toolRegistry.get('design.css-generator')!
    const category = '/categories/design'

    recordNavigation(category, studio.route)
    recordNavigation(studio.route, css.route)

    expect(getReturnRoute(css.route, category)).toBe(category)
  })

  it('carries the original entry point across workspace tabs', () => {
    const css = toolRegistry.get('design.css-generator')!
    const palette = toolRegistry.get('design.palette-generator')!

    recordNavigation('/', css.route)
    recordNavigation(css.route, palette.route)

    expect(getReturnRoute(palette.route, '/categories/design')).toBe('/')
  })

  it('keeps the query of the origin and ignores query-only changes', () => {
    recordNavigation('/tools?q=json', '/tools/developer/json-toolkit')
    recordNavigation('/tools/developer/json-toolkit', '/tools/developer/json-toolkit?tab=tree')

    expect(getReturnRoute('/tools/developer/json-toolkit', '/categories/developer')).toBe('/tools?q=json')
  })
})
