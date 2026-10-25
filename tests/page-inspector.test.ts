import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getInspectorState, runInspectorAction, setInspector } from '@/chrome/content/pageInspector/inspector'
import {
  changesToCss,
  diffInline,
  elementCss,
  measureGaps,
  outlineCss,
  parseDeclarations,
  parseTranslate,
  relevantProps,
  tidyValue,
  toHex,
} from '@/chrome/content/pageInspector/model'

describe('page inspector model', () => {
  it('only lists layout props that apply to the element', () => {
    const block = relevantProps('block', 'static')
    expect(block).toContain('margin')
    expect(block).not.toContain('gap')
    expect(block).not.toContain('top')
    const flex = relevantProps('flex', 'relative')
    expect(flex).toEqual(expect.arrayContaining(['flex-direction', 'justify-content', 'gap', 'top', 'z-index']))
    expect(flex).not.toContain('grid-template-columns')
    const grid = relevantProps('inline-grid', 'static')
    expect(grid).toEqual(expect.arrayContaining(['grid-template-columns', 'gap', 'align-items']))
    expect(grid).not.toContain('flex-direction')
  })

  it('keeps only meaningful computed values', () => {
    const computed: Record<string, string> = {
      display: 'block',
      position: 'static',
      width: '120.123456px',
      margin: '0px',
      padding: '8px 16px',
      color: 'rgb(15, 23, 42)',
      'background-color': 'rgba(0, 0, 0, 0)',
      opacity: '1',
    }
    const css = elementCss((prop) => computed[prop] ?? '')
    expect(css).toContainEqual(['width', '120.12px'])
    expect(css).toContainEqual(['padding', '8px 16px'])
    expect(css.map(([prop]) => prop)).not.toContain('margin')
    expect(css.map(([prop]) => prop)).not.toContain('background-color')
    expect(css.map(([prop]) => prop)).not.toContain('opacity')
  })

  it('formats values and colours', () => {
    expect(tidyValue('12.3456px 0.5px')).toBe('12.35px 0.5px')
    expect(toHex('rgb(255, 0, 128)')).toBe('#ff0080')
    expect(toHex('rgba(0, 0, 0, 0.5)')).toBe('rgba(0, 0, 0, 0.5)')
    expect(toHex('red')).toBe('red')
  })

  it('parses, diffs and exports declarations', () => {
    expect(parseDeclarations('color: red; /* note */ background: url(a;b.png); bogus; --x: 1')).toEqual([
      ['color', 'red'],
      ['background', 'url(a;b.png)'],
      ['--x', '1'],
    ])
    expect(diffInline('color: red; margin: 0', 'color: blue; margin: 0; width: 10px')).toEqual([
      ['color', 'blue'],
      ['width', '10px'],
    ])
    expect(
      changesToCss([
        { selector: '#a', decls: [['color', 'blue']] },
        { selector: '.empty', decls: [] },
        { selector: 'p', decls: [], notes: ['text */ edited'] },
      ]),
    ).toBe('#a {\n  color: blue;\n}\n\np {\n  /* text  edited */\n}')
  })

  it('reads translate offsets', () => {
    expect(parseTranslate('none')).toEqual({ x: 0, y: 0 })
    expect(parseTranslate('12px -4.5px')).toEqual({ x: 12, y: -4.5 })
    expect(parseTranslate('10px')).toEqual({ x: 10, y: 0 })
    expect(parseTranslate('50% 2em')).toEqual({ x: 0, y: 0 })
  })

  it('measures gaps between separate and nested boxes', () => {
    const a = { left: 0, top: 0, right: 100, bottom: 50 }
    expect(measureGaps(a, { left: 130, top: 10, right: 200, bottom: 40 }).map((g) => g.value)).toEqual([30])
    expect(measureGaps(a, { left: 0, top: 80, right: 100, bottom: 120 }).map((g) => g.value)).toEqual([30])
    const inner = { left: 10, top: 5, right: 80, bottom: 45 }
    expect(measureGaps(a, inner).map((g) => g.value)).toEqual([10, 20, 5, 5])
  })

  it('outlines every element except the inspector host', () => {
    expect(outlineCss('single', 'host')).toContain('*:not(#host)')
    const depth = outlineCss('depth', 'host').split('\n')
    expect(depth).toHaveLength(8)
    expect(depth[1].startsWith('html * *:not(#host)')).toBe(true)
  })
})

describe('page inspector runtime', () => {
  const host = () => document.getElementById('tbx-page-inspector')
  const shadow = () => host()!.shadowRoot!
  const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
  const key = (keyName: string, init: KeyboardEventInit = {}) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init }))
  const editInput = (input: HTMLInputElement, value: string) => {
    input.dispatchEvent(new Event('focus'))
    input.value = value
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('change'))
  }

  beforeEach(() => {
    document.body.innerHTML = '<main><h1 id="title" class="hero">Hello</h1><p class="lead">Some text</p></main>'
  })

  afterEach(() => {
    runInspectorAction('reset')
    setInspector({ enabled: false })
  })

  it('mounts an overlay and outline sheet, and removes them when turned off', () => {
    setInspector({ enabled: true, outlines: true })
    expect(host()).not.toBeNull()
    expect(document.getElementById('tbx-page-inspector-outlines')?.textContent).toContain(':not(#tbx-page-inspector)')
    setInspector({ outlines: false })
    expect(document.getElementById('tbx-page-inspector-outlines')).toBeNull()
    setInspector({ enabled: false })
    expect(host()).toBeNull()
  })

  it('selects on click without letting the page handle it', () => {
    setInspector({ enabled: true })
    const title = document.getElementById('title')!
    const pageHandler = vi.fn()
    title.addEventListener('click', pageHandler)
    click(title)
    expect(pageHandler).not.toHaveBeenCalled()
    expect(getInspectorState().selected).toBe('h1#title.hero')
    expect(shadow().querySelector('.panel .head .tag')?.textContent).toBe('h1#title.hero')
    expect(shadow().querySelector<HTMLInputElement>('input.txt[data-prop="display"]')?.value).toBe('block')
  })

  it('lets clicks through when selecting is turned off', () => {
    setInspector({ enabled: true, select: false })
    const title = document.getElementById('title')!
    const pageHandler = vi.fn()
    title.addEventListener('click', pageHandler)
    click(title)
    expect(pageHandler).toHaveBeenCalledTimes(1)
    expect(getInspectorState().selected).toBeNull()
  })

  it('edits styles live, exports them as CSS and undoes them', () => {
    setInspector({ enabled: true, select: true })
    const title = document.getElementById('title')!
    click(title)
    const color = shadow().querySelector<HTMLInputElement>('input.txt[data-prop="color"]')!
    editInput(color, '#ff0000')
    expect(title.style.color).toMatch(/rgb\(255, 0, 0\)|#ff0000/)
    expect(getInspectorState()).toMatchObject({ changes: 1, canUndo: true })
    const { css } = runInspectorAction('export')
    expect(css).toMatch(/^#title \{\n {2}color: (rgb\(255, 0, 0\)|#ff0000);\n\}$/)

    runInspectorAction('undo')
    expect(title.getAttribute('style') ?? '').toBe('')
    expect(getInspectorState()).toMatchObject({ changes: 0, canUndo: false })
  })

  it('deletes with the keyboard and restores everything on reset', () => {
    setInspector({ enabled: true, select: true })
    const lead = document.querySelector('p.lead')!
    click(lead)
    key('Delete')
    expect(lead.isConnected).toBe(false)
    expect(getInspectorState().selected).toBeNull()
    expect(runInspectorAction('export').css).toContain('display: none;')

    runInspectorAction('reset')
    expect(lead.isConnected).toBe(true)
    expect(getInspectorState().changes).toBe(0)
  })

  it('duplicates, hides and walks to the parent from the panel', () => {
    setInspector({ enabled: true, select: true })
    const title = document.getElementById('title')!
    click(title)
    shadow().querySelector<HTMLButtonElement>('button[aria-label="Duplicate"]')!.click()
    expect(document.querySelectorAll('h1')).toHaveLength(2)
    key('ArrowUp', { altKey: true })
    expect(getInspectorState().selected).toBe('main')
    shadow().querySelector<HTMLButtonElement>('button[aria-label="Hide"]')!.click()
    expect(document.querySelector('main')!.style.display).toBe('none')
    key('z', { ctrlKey: true })
    expect(document.querySelector('main')!.style.display).toBe('')
    key('z', { ctrlKey: true })
    expect(document.querySelectorAll('h1')).toHaveLength(1)
  })

  it('exports a selector that matches only the edited element in repeated markup', () => {
    document.body.innerHTML = '<section class="grid"><article class="card"><h2>A</h2></article><article class="card"><h2>B</h2></article></section>'
    setInspector({ enabled: true, select: true })
    const second = document.querySelectorAll('h2')[1]
    click(second)
    editInput(shadow().querySelector<HTMLInputElement>('input.txt[data-prop="font-size"]')!, '30px')
    const selector = runInspectorAction('export').css!.split(' {')[0]
    expect([...document.querySelectorAll(selector)]).toEqual([second])
  })

  it('keeps edits on the page after the inspector is turned off', () => {
    setInspector({ enabled: true, select: true })
    const title = document.getElementById('title')!
    click(title)
    editInput(shadow().querySelector<HTMLInputElement>('input.txt[data-prop="font-size"]')!, '40px')
    setInspector({ enabled: false })
    expect(host()).toBeNull()
    expect(title.style.fontSize).toBe('40px')
    expect(getInspectorState().changes).toBe(1)
  })
})
