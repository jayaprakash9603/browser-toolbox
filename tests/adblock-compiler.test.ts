import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  badfilterTarget,
  isSafeSelector,
  parseFilterLine,
  toRegexFilter,
  // @ts-expect-error build-time converter modules are plain ESM
} from '../scripts/adblock/converter/parseFilter.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { REDIRECT_FILES, resolveRedirect } from '../scripts/adblock/converter/redirects.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { networkFilterToDnrRule, PRIORITY } from '../scripts/adblock/converter/toDnrRule.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { validateDnrRule, validateRuleset } from '../scripts/adblock/converter/validate.mjs'

interface Rule {
  id: number
  priority: number
  action: {
    type: string
    redirect?: { extensionPath?: string; transform?: { queryTransform?: { removeParams?: string[] } } }
    responseHeaders?: { header: string; operation: string; value?: string }[]
  }
  condition: Record<string, unknown>
}

const toRule = (line: string): Rule | null => {
  const parsed = parseFilterLine(line)
  return parsed.kind === 'network' ? networkFilterToDnrRule(parsed, 1, resolveRedirect) : null
}

describe('uBO network filter options', () => {
  it('ranks $important above exceptions and exceptions above blocks', () => {
    expect(toRule('||ads.example^')!.priority).toBe(PRIORITY.block)
    expect(toRule('@@||ads.example^')!.priority).toBe(PRIORITY.allow)
    expect(toRule('||ads.example^$important')!.priority).toBe(PRIORITY.importantBlock)
    expect(PRIORITY.importantBlock).toBeGreaterThan(PRIORITY.allow)
    expect(PRIORITY.importantAllow).toBeLessThan(100)
  })

  it('maps $redirect onto packaged neutered resources', () => {
    const rule = toRule('||cdn.example/ads.js$script,redirect=noop.js')!
    expect(rule.action).toEqual({ type: 'redirect', redirect: { extensionPath: '/adblock/redirects/noop.js' } })
    expect(rule.priority).toBe(PRIORITY.redirect)
    const unknown = toRule('||cdn.example/ads.mp4$media,redirect=noopmp4-1s')!
    expect(unknown.action.type).toBe('block')
  })

  it('ships a file for every redirect resource', () => {
    for (const file of REDIRECT_FILES) {
      expect(existsSync(resolve(__dirname, '../public/adblock/redirects', file))).toBe(true)
    }
  })

  it('converts $removeparam to a query transform that never outranks a block', () => {
    const rule = toRule('$removeparam=utm_source,domain=example.com')!
    expect(rule.action.redirect?.transform?.queryTransform?.removeParams).toEqual(['utm_source'])
    expect(rule.priority).toBe(PRIORITY.block)
    expect(rule.condition.resourceTypes).toEqual(['main_frame', 'sub_frame', 'xmlhttprequest'])
    expect(toRule('$removeparam=/^utm_/')).toBeNull()
  })

  it('converts $csp to an appended response header', () => {
    const rule = toRule("||example.com^$csp=script-src 'self'")!
    expect(rule.action.responseHeaders).toEqual([
      { header: 'content-security-policy', operation: 'append', value: "script-src 'self'" },
    ])
    expect(toRule('@@||example.com^$csp')).toBeNull()
    expect(toRule("$csp=script-src 'self',domain=site.example")!.condition).toEqual({
      requestDomains: ['site.example'],
      resourceTypes: ['main_frame', 'sub_frame'],
    })
  })

  it('supports $denyallow, $to, $method, negated types and $document', () => {
    expect(toRule('*$script,denyallow=cdn.example|static.example,domain=site.example')!.condition).toMatchObject({
      excludedRequestDomains: ['cdn.example', 'static.example'],
      initiatorDomains: ['site.example'],
    })
    expect(toRule('/track$to=a.example|~b.a.example')!.condition).toMatchObject({
      requestDomains: ['a.example'],
      excludedRequestDomains: ['b.a.example'],
    })
    expect(toRule('||x.example/api$method=post')!.condition.requestMethods).toEqual(['post'])
    expect(toRule('/adserver.$~xmlhttprequest,~stylesheet')!.condition.excludedResourceTypes).toEqual([
      'xmlhttprequest',
      'stylesheet',
    ])
    expect(toRule('||malware.example^$document')!.condition.resourceTypes).toEqual(['main_frame'])
    const allowAll = toRule('@@||trusted.example^$document')!
    expect(allowAll.action.type).toBe('allowAllRequests')
    expect(allowAll.condition.resourceTypes).toEqual(['main_frame', 'sub_frame'])
  })

  it('keeps pattern-less filters only when they are narrowed', () => {
    expect(toRule('$third-party,xmlhttprequest,domain=site.example')!.condition).toMatchObject({
      initiatorDomains: ['site.example'],
    })
    expect(toRule('$third-party,script')).toBeNull()
  })

  it('punycodes internationalised domains', () => {
    expect(toRule('||bücher.example^')!.condition.requestDomains).toEqual(['xn--bcher-kva.example'])
  })

  it('accepts RE2-compatible regex filters only', () => {
    expect(toRule('/^https?:\\/\\/[a-z]{8}\\.com\\/ad\\.js/$script')!.condition.regexFilter).toBe(
      '^https?:\\/\\/[a-z]{8}\\.com\\/ad\\.js',
    )
    expect(toRegexFilter('ads(?=\\.js)')).toBeNull()
    expect(toRegexFilter('(a)\\1')).toBeNull()
    expect(toRegexFilter('[unclosed')).toBeNull()
  })

  it('skips options DNR cannot express', () => {
    expect(toRule('||popunder.example^$popup')).toBeNull()
    expect(toRule('||x.example/a.js$replace=/a/b/')).toBeNull()
    expect(toRule('||x.example^$redirect-rule=noop.js')).toBeNull()
  })

  it('derives the filter a $badfilter cancels', () => {
    expect(badfilterTarget('||ads.example^$badfilter')).toBe('||ads.example^')
    expect(badfilterTarget('||ads.example^$script,badfilter')).toBe('||ads.example^$script')
    expect(badfilterTarget('||ads.example^$script')).toBeNull()
  })
})

describe('cosmetic filter parsing', () => {
  it('turns $generichide/$elemhide exceptions into cosmetic controls', () => {
    expect(parseFilterLine('@@||news.example^$generichide')).toEqual({
      kind: 'cosmetic-control',
      control: 'generichide',
      hosts: ['news.example'],
    })
    expect(parseFilterLine('@@||shop.example^$ehide').control).toBe('elemhide')
    expect(parseFilterLine('||news.example^$generichide').kind).toBe('skip')
  })

  it('keeps ~domain negations and entities', () => {
    expect(parseFilterLine('example.com,~sub.example.com##.ad')).toMatchObject({
      kind: 'cosmetic',
      domains: ['example.com'],
      excludedDomains: ['sub.example.com'],
    })
    expect(parseFilterLine('google.*##.ad').domains).toEqual(['google.*'])
  })

  it('rejects selectors that could inject CSS or are procedural', () => {
    expect(isSafeSelector('.ad')).toBe(true)
    expect(isSafeSelector('div:has(> a[href*="ads"])')).toBe(true)
    expect(isSafeSelector('.ad{display:block}body{background:red')).toBe(false)
    expect(isSafeSelector('.ad /* x */')).toBe(false)
    expect(isSafeSelector('div:has-text(Sponsored)')).toBe(false)
    expect(isSafeSelector('a[href="x"')).toBe(false)
  })
})

describe('DNR rule validation', () => {
  const base = { id: 1, priority: 1, action: { type: 'block' } }

  it('accepts well-formed rules', () => {
    expect(validateDnrRule({ ...base, condition: { requestDomains: ['ads.example'] } })).toBeNull()
  })

  it('rejects rules Chrome would refuse or that match everything', () => {
    expect(validateDnrRule({ ...base, condition: {} })).toBe('matches everything')
    expect(validateDnrRule({ ...base, condition: { urlFilter: 'é' } })).toBe('bad urlFilter')
    expect(
      validateDnrRule({ ...base, condition: { urlFilter: '/ad', resourceTypes: ['script'], excludedResourceTypes: ['image'] } }),
    ).toBe('both resource type lists')
    expect(validateDnrRule({ ...base, condition: { urlFilter: '/ad', resourceTypes: ['bogus'] } })).toBe(
      'bad resourceTypes',
    )
    expect(validateDnrRule({ ...base, condition: { requestDomains: ['UPPER.example'] } })).toBe(
      'bad requestDomains',
    )
    expect(
      validateDnrRule({ ...base, action: { type: 'allowAllRequests' }, condition: { requestDomains: ['a.example'] } }),
    ).toBe('allowAllRequests needs frame types')
  })

  it('caps regex rules per ruleset', () => {
    const rules = Array.from({ length: 1005 }, (_, i) => ({ ...base, id: i + 1, condition: { regexFilter: `ad${i}` } }))
    const { rules: kept, rejected } = validateRuleset(rules)
    expect(kept).toHaveLength(1000)
    expect(rejected['regex cap']).toBe(5)
  })
})
