import { describe, expect, it } from 'vitest'

// @ts-expect-error build-time converter modules are plain ESM
import { parseFilterLine } from '../scripts/adblock/converter/parseFilter.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { networkFilterToDnrRule, resetRuleIdCounter } from '../scripts/adblock/converter/toDnrRule.mjs'

describe('adblock filter converter', () => {
  it('parses domain block filters', () => {
    const parsed = parseFilterLine('||doubleclick.net^')
    expect(parsed.kind).toBe('network')
    if (parsed.kind === 'network') {
      expect(parsed.host?.value).toBe('doubleclick.net')
      expect(parsed.exception).toBe(false)
    }
  })

  it('parses cosmetic filters', () => {
    expect(parseFilterLine('##.ad').kind).toBe('cosmetic')
    expect(parseFilterLine('example.com##.banner').kind).toBe('cosmetic')
    expect(parseFilterLine('#@#.ad').kind).toBe('cosmetic-exception')
  })

  it('converts to DNR block and allow rules', () => {
    resetRuleIdCounter(100)
    const block = parseFilterLine('||ads.example.com^')
    expect(block.kind).toBe('network')
    if (block.kind !== 'network') return
    const rule = networkFilterToDnrRule(block)
    expect(rule?.action.type).toBe('block')

    const allow = parseFilterLine('@@||cdn.example.com^$domain=example.com')
    expect(allow.kind).toBe('network')
    if (allow.kind !== 'network') return
    const allowRule = networkFilterToDnrRule(allow)
    expect(allowRule?.action.type).toBe('allow')
  })

  it('honors $domain= option', () => {
    const parsed = parseFilterLine('||tracker.com^$domain=example.com|~foo.com')
    expect(parsed.kind).toBe('network')
    if (parsed.kind !== 'network') return
    expect(parsed.opts.domains).toContain('example.com')
    expect(parsed.opts.excludedDomains).toContain('foo.com')
  })
})
