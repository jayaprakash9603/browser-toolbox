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

  it('normalizes hosts and rejects garbage', () => {
    expect(normalizeThreatHost('||PayPal.com^')).toBe('paypal.com')
    expect(normalizeThreatHost('a')).toBeNull()
    expect(NEVER_BLOCK.has('google.com')).toBe(true)
  })
})
