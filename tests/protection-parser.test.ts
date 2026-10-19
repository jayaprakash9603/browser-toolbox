import { describe, expect, it } from 'vitest'

// @ts-expect-error build-time ESM script without types
import { NEVER_BLOCK, normalizeThreatHost, parseBadwareList, parseDomainList } from '../scripts/protection/build-threat-lists.mjs'

describe('protection list parser', () => {
  it('parses domain list lines and skips comments', () => {
    const hosts = parseDomainList(`# comment
evil-phish.example
||another-bad.net^
`)
    expect(hosts).toContain('evil-phish.example')
    expect(hosts).toContain('another-bad.net')
  })

  it('parses uBO badware domain rules', () => {
    const hosts = parseBadwareList(`
! comment
||dailyque.site^$all
||calmnotice.site^$doc
||not-a-domain
`)
    expect(hosts).toEqual(['dailyque.site', 'calmnotice.site'])
  })

  it('parses hosts-file lines and skips sinkhole addresses', () => {
    const hosts = parseDomainList(`0.0.0.0 miner-pool.example
127.0.0.1 localhost
0.0.0.0
`)
    expect(hosts).toContain('miner-pool.example')
    expect(hosts).not.toContain('0.0.0.0')
    expect(hosts).not.toContain('127.0.0.1')
  })

  it('skips ABP filters whose options narrow or change their meaning', () => {
    const hosts = parseBadwareList(`||scoped.example^$domain=a.test
||killed.example^$badfilter
||plain.example^
`)
    expect(hosts).toEqual(['plain.example'])
  })

  it('normalizes hosts and rejects garbage', () => {
    expect(normalizeThreatHost('||PayPal.com^')).toBe('paypal.com')
    expect(normalizeThreatHost('a')).toBeNull()
    expect(NEVER_BLOCK.has('google.com')).toBe(true)
  })
})
