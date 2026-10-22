import { afterEach, describe, expect, it } from 'vitest'

import { run, startProcedural, type ProceduralTask } from '@/chrome/content/adblock/procedural'
// @ts-expect-error build-time converter modules are plain ESM
import { createCosmeticCollector } from '../scripts/adblock/converter/cosmetic.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { parseFilterLine } from '../scripts/adblock/converter/parseFilter.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { compileProceduralFilter, compileTask, isSafeDeclaration } from '../scripts/adblock/converter/procedural.mjs'

const task = (body: string) => compileTask(body) as ProceduralTask

describe('procedural filter compiler', () => {
  it('compiles operator chains into tasks', () => {
    expect(compileTask('div.ad:has-text(/Sponsored/i):upward(2)')).toEqual({
      sel: 'div.ad',
      ops: [
        ['has-text', 'Sponsored', 'i'],
        ['upward', 2],
      ],
    })
    expect(compileTask('.card:has(> .label:has-text(Ad)) > a')).toEqual({
      sel: '.card',
      ops: [
        ['has', { sel: ':scope > .label', ops: [['has-text', 'Ad', '']] }],
        ['spath', '> a'],
      ],
    })
  })

  it('maps ABP / AdGuard aliases onto uBO operators', () => {
    expect(compileTask('div:-abp-contains(promo)')?.ops).toEqual([['has-text', 'promo', '']])
    expect(compileTask('div:-abp-has(.x:contains(y))')?.ops[0][0]).toBe('has')
    expect(compileTask('a:nth-ancestor(3)')?.ops).toEqual([['upward', 3]])
    expect(compileTask('li:if-not(:has-text(keep))')?.ops[0][0]).toBe('not')
  })

  it('keeps native :has() / :not() as CSS when their argument is plain', () => {
    expect(compileProceduralFilter('div:has(> .ad):not(.keep)')).toEqual({ hide: 'div:has(> .ad):not(.keep)' })
  })

  it('turns plain selector:style() into a CSS rule and validates declarations', () => {
    expect(compileProceduralFilter('body:style(overflow: auto !important)')).toEqual({
      css: 'body{overflow: auto !important}',
    })
    for (const bad of ['background: url(x)', 'a}b{c', 'x: image-set(a)', '/* c */', 'b: expression(1)']) {
      expect(isSafeDeclaration(bad)).toBe(false)
      expect(compileProceduralFilter(`div:style(${bad})`)).toBeNull()
    }
  })

  it('compiles actions and rejects anything after an action', () => {
    expect(compileTask('.ad:remove()')).toEqual({ sel: '.ad', ops: [], action: ['remove'] })
    expect(compileTask('a:remove-attr(onclick)')?.action).toEqual(['remove-attr', '^onclick$', ''])
    expect(compileTask('.ad:remove() > a')).toBeNull()
    expect(compileTask('.ad:remove():style(color: red)')).toBeNull()
  })

  it('accepts regex quantifiers, quoted attribute names and page conditions', () => {
    expect(compileTask('[id]:matches-attr(id=/[a-z]{40,}/)')?.ops).toEqual([
      ['matches-attr', ['^id$', ''], ['[a-z]{40,}', '']],
    ])
    expect(compileTask('a:matches-attr("href"="/^.{100,}/")')?.ops[0]).toEqual(['matches-attr', ['^href$', ''], ['^.{100,}', '']])
    expect(compileTask(':matches-path(/^\\/news/) .promo')).toEqual({ sel: '.promo', ops: [['matches-path', '^\\/news', '']] })
    expect(compileTask(':not(:matches-path(/home/)) .promo')?.ops[0]).toEqual([
      'not',
      { sel: null, ops: [['matches-path', 'home', '']] },
    ])
  })

  it('splits a compound after an operator from the step that follows it', () => {
    expect(compileTask('div:has-text(x).ad .child')?.ops).toEqual([
      ['has-text', 'x', ''],
      ['matches', '.ad'],
      ['spath', '.child'],
    ])
  })

  it('rejects invalid or unsupported procedural filters', () => {
    for (const bad of [
      'div:has-text(/[/)',
      'div:upward(0)',
      'div:upward(300)',
      'div:min-text-length(abc)',
      'div:-abp-properties(width: 1px)',
      ':has-text(ad)',
      'div:watch-attr(a b)',
      'div:has-text(x',
    ]) {
      expect(compileTask(bad), bad).toBeNull()
    }
  })
})

describe('procedural filters in the list parser', () => {
  it('parses #?# and procedural ## filters, host-specific only', () => {
    const p = parseFilterLine('example.com##div:has-text(Ad)')
    expect(p.kind).toBe('procedural')
    expect(p.domains).toEqual(['example.com'])
    expect(parseFilterLine('##div:has-text(Ad)').kind).toBe('skip')
    expect(parseFilterLine('example.com#?#.ad').kind).toBe('cosmetic')
    expect(parseFilterLine('example.com#@#div:has-text(Ad)').kind).toBe('procedural-exception')
    expect(parseFilterLine('example.com#$#body { color: red }').kind).toBe('skip')
  })

  it('does not treat escaped colons in class names as operators', () => {
    expect(parseFilterLine('example.com##.hover\\:shadow-xl').kind).toBe('cosmetic')
  })

  it('stores procedural entries per host and honours exceptions', () => {
    const collector = createCosmeticCollector()
    for (const line of [
      'a.com,b.com,~sub.a.com##div:has-text(Ad)',
      'b.com#@#div:has-text(Ad)',
      'a.com##body:style(overflow: auto)',
    ]) {
      const parsed = parseFilterLine(line)
      collector.addProcedural(parsed)
    }
    const built = collector.build()
    expect(built.procedural['a.com']).toEqual([
      ['div:has-text(Ad)', { sel: 'div', ops: [['has-text', 'Ad', '']] }],
      ['body:style(overflow: auto)', { css: 'body{overflow: auto}' }],
    ])
    expect(built.procedural['b.com']).toBeUndefined()
    expect(built.proceduralExceptions['sub.a.com']).toEqual(['div:has-text(Ad)'])
  })
})

describe('procedural engine', () => {
  let stop: (() => void) | null = null
  afterEach(() => {
    stop?.()
    stop = null
    document.body.innerHTML = ''
  })

  it('evaluates text, upward, has, not, attr and xpath operators', () => {
    document.body.innerHTML = `
      <div class="card" id="c1"><span class="label">Sponsored</span><a href="/x">x</a></div>
      <div class="card" id="c2"><span class="label">News</span></div>
      <div class="card" id="c3" data-track="abcdefghij"><b>long text here</b></div>`
    const ids = (t: ProceduralTask) => run(t, document).map((el) => el.id)
    expect(ids(task('span:has-text(Sponsored):upward(.card)'))).toEqual(['c1'])
    expect(ids(task('span.label:has-text(/^news$/i):upward(1)'))).toEqual(['c2'])
    expect(ids(task('.card:has(> .label:has-text(Spons))'))).toEqual(['c1'])
    expect(ids(task('.card:not(:has-text(News))'))).toEqual(['c1', 'c3'])
    expect(ids(task('.card:matches-attr(/^data-/=/^[a-j]{10}$/)'))).toEqual(['c3'])
    expect(ids(task('.card:min-text-length(12)'))).toEqual(['c3'])
    expect(ids(task(':xpath(//div[span[text()="News"]])'))).toEqual(['c2'])
    expect(run(task('.card:has-text(Sponsored) > a'), document).map((el) => el.tagName)).toEqual(['A'])
  })

  it('hides matches, follows DOM changes and un-hides elements that stop matching', async () => {
    document.body.innerHTML = '<p id="a">Advertisement</p><p id="b">story</p>'
    const reports: number[] = []
    stop = startProcedural([task('p:has-text(Advertisement)')], { report: (n) => reports.push(n) })
    const a = document.getElementById('a')!
    const hiddenAttr = () => a.getAttributeNames().find((n) => n.startsWith('tbx'))
    expect(hiddenAttr()).toBeTruthy()
    expect(document.getElementById('b')!.getAttributeNames()).toEqual(['id'])
    expect(reports).toEqual([1])

    a.textContent = 'just text'
    document.body.append(Object.assign(document.createElement('p'), { id: 'c', textContent: 'Advertisement' }))
    await new Promise((r) => setTimeout(r, 250))
    expect(hiddenAttr()).toBeUndefined()
    expect(document.getElementById('c')!.getAttributeNames().length).toBe(2)

    stop()
    stop = null
    expect(document.getElementById('c')!.getAttributeNames()).toEqual(['id'])
  })

  it('applies style, remove, remove-attr and remove-class actions', () => {
    document.body.innerHTML = '<div id="s">x</div><div id="r">ad</div><a id="l" onclick="x()" class="ad-x keep">l</a>'
    stop = startProcedural([
      task('#s:has-text(x):style(color: red !important)'),
      task('#r:has-text(ad):remove()'),
      task('a:has-text(l):remove-attr(onclick)'),
      task('a:has-text(l):remove-class(/^ad-/)'),
    ])
    const styleAttr = document.getElementById('s')!.getAttributeNames().find((n) => n.startsWith('tbx'))!
    const rules = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    expect(rules).toContain(`[${styleAttr}]{color: red !important}`)
    expect(document.getElementById('r')).toBeNull()
    const link = document.getElementById('l')!
    expect(link.hasAttribute('onclick')).toBe(false)
    expect([...link.classList]).toEqual(['keep'])
  })

  it('drops a filter whose selector the browser rejects without affecting others', () => {
    document.body.innerHTML = '<p id="a">Ad</p>'
    stop = startProcedural([{ sel: 'p:unknown-pseudo', ops: [['has-text', 'Ad', '']] }, task('p:has-text(Ad)')])
    expect(document.getElementById('a')!.getAttributeNames().length).toBe(2)
  })
})
