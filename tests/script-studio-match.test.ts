import { describe, expect, it } from 'vitest'

import { buildMatchPlan, isBroadMatch, urlMatchesPlan } from '@/core/script-studio/match'

describe('script-studio match', () => {
  it('flags broad patterns', () => {
    expect(isBroadMatch(['*://*/*'])).toBe(true)
    expect(isBroadMatch(['https://example.com/*'])).toBe(false)
  })

  it('matches URLs against plan', () => {
    const plan = buildMatchPlan(['https://example.com/*'], [], [])
    expect(urlMatchesPlan('https://example.com/page', plan)).toBe(true)
    expect(urlMatchesPlan('https://other.com/', plan)).toBe(false)
  })
})
