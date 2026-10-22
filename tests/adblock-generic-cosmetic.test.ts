import { describe, expect, it } from 'vitest'

import { bloomHas, parseBloom } from '@/core/adblock/bloom'
import { genericKeyShard as genericKeyShardTs, GENERIC_SHARD_COUNT } from '@/core/adblock/shard'

// @ts-expect-error build-time converter modules are plain ESM
import { buildBloom } from '../scripts/adblock/converter/bloom.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { createCosmeticCollector, genericSelectorKey } from '../scripts/adblock/converter/cosmetic.mjs'
// @ts-expect-error build-time converter modules are plain ESM
import { genericKeyShard as genericKeyShardMjs } from '../scripts/adblock/converter/shard.mjs'

describe('generic cosmetic keys', () => {
  it('keys selectors by their leading id or class', () => {
    expect(genericSelectorKey('.ad-banner')).toBe('.ad-banner')
    expect(genericSelectorKey('#sidebar-ad > div')).toBe('#sidebar-ad')
    expect(genericSelectorKey('.promo[data-x="1"]')).toBe('.promo')
    expect(genericSelectorKey('.top\\:ad')).toBe('.top:ad')
  })

  it('leaves selectors without a leading id/class as highly generic', () => {
    expect(genericSelectorKey('div[id^="ad-"]')).toBeNull()
    expect(genericSelectorKey('a[href*="doubleclick"]')).toBeNull()
    expect(genericSelectorKey('ins.adsbygoogle')).toBeNull()
  })

  it('splits generic filters and honours generic exceptions', () => {
    const collector = createCosmeticCollector()
    collector.add({ kind: 'cosmetic', domains: [], selector: '.ad' })
    collector.add({ kind: 'cosmetic', domains: [], selector: '.ad .label' })
    collector.add({ kind: 'cosmetic', domains: [], selector: '[data-ad]' })
    collector.add({ kind: 'cosmetic', domains: [], selector: '#gone' })
    collector.add({ kind: 'cosmetic-exception', domains: [], selector: '#gone' })
    const built = collector.build(['ins.adsbygoogle'])
    expect(built.keyed['.ad']).toEqual(['.ad', '.ad .label'])
    expect(built.keyed['#gone']).toBeUndefined()
    expect(built.highlyGenericCss).toContain('[data-ad]{display:none!important}')
    expect(built.highlyGenericCss).toContain('ins.adsbygoogle{display:none!important}')
  })
})

describe('generic key bloom filter', () => {
  it('finds every inserted key and rejects most others', () => {
    const keys = Array.from({ length: 2000 }, (_, i) => `.ad-${i}`)
    const raw = buildBloom(keys)
    const bloom = parseBloom(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength))
    expect(bloom).not.toBeNull()
    for (const key of keys) expect(bloomHas(bloom!, key)).toBe(true)
    let falsePositives = 0
    for (let i = 0; i < 2000; i++) if (bloomHas(bloom!, `#other-${i}`)) falsePositives++
    expect(falsePositives).toBeLessThan(60)
  })

  it('uses the same shard for a key in the build script and the runtime', () => {
    for (const key of ['.ad', '#banner', '.sponsored-post', '#x']) {
      expect(genericKeyShardTs(key)).toBe(genericKeyShardMjs(key))
      expect(genericKeyShardTs(key)).toBeLessThan(GENERIC_SHARD_COUNT)
    }
  })
})
