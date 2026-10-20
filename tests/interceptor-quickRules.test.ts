import { describe, expect, it } from 'vitest'

import { compileRulesToDnr } from '@/core/interceptor/toDnr'
import { testRulesAgainstUrl } from '@/core/interceptor/matcher'
import { buildQuickRule } from '@/features/interceptor/quickRules'

const URL_ = 'https://images.unsplash.com/photo-1?w=480&q=60'

describe('quick rules from the network inspector', () => {
  it('replace host rewrites the host and compiles to a regex DNR redirect', () => {
    const rule = buildQuickRule('replaceHost', { url: URL_, a: 'images.unsplash.com', b: 'staging.example.com' })
    expect(testRulesAgainstUrl([rule], URL_).transformedUrl).toBe('https://staging.example.com/photo-1?w=480&q=60')
    const { rules } = compileRulesToDnr([rule], 3_000_000)
    expect(rules[0].condition.regexFilter).toContain('images')
    expect(rules[0].action.redirect?.regexSubstitution).toBe('\\1staging.example.com\\2')
  })

  it('replace part of URL', () => {
    const rule = buildQuickRule('replacePart', { url: URL_, a: 'w=480', b: 'w=100' })
    expect(testRulesAgainstUrl([rule], URL_).transformedUrl).toBe('https://images.unsplash.com/photo-1?w=100&q=60')
  })

  it('header, query and block rules compile to DNR', () => {
    const header = buildQuickRule('requestHeader', { url: URL_, a: 'X-Debug', b: '1', headerOp: 'set' })
    const query = buildQuickRule('addQueryParam', { url: URL_, a: 'debug', b: '1' })
    const cancel = buildQuickRule('cancel', { url: URL_ })
    const { rules, errors } = compileRulesToDnr([header, query, cancel], 3_000_000)
    expect(errors).toEqual([])
    expect(rules.map((r) => r.action.type).sort()).toEqual(['block', 'modifyHeaders', 'redirect'])
  })
})
