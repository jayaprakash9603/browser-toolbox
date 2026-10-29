import { describe, expect, it } from 'vitest'

import { formatCaptionForInstagram } from '@/core/sites/instagram/captionFormat'
import { detectTechnologies } from '@/core/engines/techStack/detect'
import { generateTotp, normalizeBase32Secret } from '@/core/security/totp'
import { htmlToMarkdown } from '@/core/text/htmlToMarkdown'
import { isBrokenStatus } from '@/core/engines/linkChecker/check'

describe('consolidation core', () => {
  it('formats instagram caption line breaks', () => {
    const out = formatCaptionForInstagram('line1\n\nline2')
    expect(out).toContain('\u200B')
  })

  it('detects react from script src', () => {
    const hits = detectTechnologies({
      url: 'https://example.com',
      scripts: ['https://cdn.example.com/react.production.min.js'],
      resources: [],
      inlineScripts: '',
      meta: {},
      headers: {},
      cookies: [],
      jsValues: {},
      domMatches: [],
      html: '',
    })
    expect(hits.some((h) => h.name === 'React')).toBe(true)
  })

  it('generates totp for known test vector secret', async () => {
    const secret = normalizeBase32Secret('JBSWY3DPEHPK3PXP')
    const code = await generateTotp(secret, Date.UTC(2009, 1, 13, 23, 31, 30))
    expect(code).toMatch(/^\d{6}$/)
  })

  it('converts simple html to markdown', () => {
    const md = htmlToMarkdown('<p>Hello <strong>world</strong></p>')
    expect(md).toContain('**world**')
  })

  it('flags broken link statuses', () => {
    expect(isBrokenStatus(404)).toBe(true)
    expect(isBrokenStatus(200)).toBe(false)
  })
})
