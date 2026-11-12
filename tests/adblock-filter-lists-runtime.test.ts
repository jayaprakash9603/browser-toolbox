import { describe, expect, it } from 'vitest'

import { compileDomainBlockRules } from '@/core/adblock/filterLists/runtimeCompiler'

describe('runtime filter compiler', () => {
  it('compiles ||domain^ lines into chunked DNR rules', () => {
    const lines = ['||doubleclick.net^', '||ads.example.com^', '##.ad', 'noise']
    const { rules, unsupported, domains } = compileDomainBlockRules(lines, 2_000_000, 10)
    expect(domains).toBe(2)
    expect(unsupported).toBe(1)
    expect(rules.length).toBe(1)
    expect(rules[0].condition?.requestDomains?.sort()).toEqual(['ads.example.com', 'doubleclick.net'])
    expect(rules[0].id).toBe(2_000_000)
  })

  it('respects maxRules cap', () => {
    const lines = Array.from({ length: 1200 }, (_, i) => `||host${i}.ads.example^`)
    const { rules } = compileDomainBlockRules(lines, 2_000_000, 1)
    expect(rules.length).toBe(1)
  })
})
