import { describe, expect, it } from 'vitest'

import { hostShard as hostShardTs, SHARD_COUNT } from '@/core/adblock/shard'
// @ts-expect-error build-time converter modules are plain ESM
import { parseFilterLine, toUrlFilter } from '../scripts/adblock/converter/parseFilter.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { hostShard as hostShardMjs } from '../scripts/adblock/converter/shard.mjs'
import {
  mergeDomainRules,
  networkFilterToDnrRule,
  resetRuleIdCounter,
  // @ts-expect-error build-time converter modules are plain ESM
} from '../scripts/adblock/converter/toDnrRule.mjs'

interface TestRule {
  id?: number
  priority: number
  action: { type: string }
  condition: { requestDomains?: string[]; urlFilter?: string; domainType?: string }
}

const block = (domain: string, extra: object = {}): TestRule => ({
  priority: 1,
  action: { type: 'block' },
  condition: { requestDomains: [domain], ...extra },
})

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

  it('converts path filters to urlFilter rules instead of dropping them', () => {
    const parsed = parseFilterLine('||example.com/banners/ads.js')
    expect(parsed.kind).toBe('network')
    if (parsed.kind !== 'network') return
    expect(parsed.host?.type).toBe('url')
    const rule = networkFilterToDnrRule(parsed)
    expect(rule?.condition.urlFilter).toBe('||example.com/banners/ads.js')
  })

  it('rejects url patterns Chrome cannot accept or that are too broad', () => {
    expect(toUrlFilter('/banner\\d+/')).toBeNull()
    expect(toUrlFilter('ads')).toBeNull()
    expect(toUrlFilter('||*.example.com/x')).toBeNull()
    expect(toUrlFilter('a||bcdef')).toBeNull()
    expect(toUrlFilter('/pagead/ads?client=')).toBe('/pagead/ads?client=')
    expect(toUrlFilter('*/adframe.js*')).toBe('/adframe.js')
  })

  it('merges single-domain rules and drops subdomains covered by a parent', () => {
    const { merged, rest } = mergeDomainRules([
      block('ads.com'),
      block('cdn.ads.com'),
      block('tracker.net'),
      block('thirdparty.org', { domainType: 'thirdParty' }),
      block('x.io', { urlFilter: '||x.io/ad' }),
    ])
    expect(rest).toHaveLength(1)
    const plain = merged.find((r: TestRule) => !r.condition.domainType)
    expect(plain.condition.requestDomains.sort()).toEqual(['ads.com', 'tracker.net'])
    expect(merged.find((r: TestRule) => r.condition.domainType)?.condition.requestDomains).toEqual([
      'thirdparty.org',
    ])
  })

  it('chunks very large merged rules', () => {
    const rules = Array.from({ length: 1200 }, (_, i) => block(`host${i}.example${i % 7}.net`))
    const { merged } = mergeDomainRules(rules)
    expect(merged.length).toBeGreaterThan(1)
    for (const rule of merged) expect(rule.condition.requestDomains.length).toBeLessThanOrEqual(500)
  })

  it('shards identically in the build script and the content script', () => {
    for (const host of ['zerogpt.com', 'youtube.com', 'news.example.co.uk', 'a.b', 'ünï.test']) {
      expect(hostShardTs(host)).toBe(hostShardMjs(host))
      expect(hostShardTs(host)).toBeLessThan(SHARD_COUNT)
    }
  })
})
