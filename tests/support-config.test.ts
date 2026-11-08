import { describe, expect, it } from 'vitest'

import {
  CHROME_STORE_LISTING_URL,
  EDGE_STORE_LISTING_URL,
  FEEDBACK_SUBJECT,
  SUPPORT_EMAIL,
  buildIssueUrl,
  buildMailtoUrl,
  buildReportBody,
  formatDiagnostics,
  storeListingUrl,
} from '@/core/support/config'

const report = {
  title: 'Search is empty',
  toolName: 'Text Studio',
  description: 'Nothing shows.',
  steps: '',
  diagnostics: formatDiagnostics({ version: '1.2.0', userAgent: 'UA', route: '/tools/text/studio', theme: 'dark' }),
}

describe('support config', () => {
  it('builds a mailto link with the feedback subject', () => {
    const url = buildMailtoUrl(FEEDBACK_SUBJECT)
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true)
    expect(decodeURIComponent(url)).toContain('One Panel — Feedback')
  })

  it('omits empty sections from the report body', () => {
    const body = buildReportBody(report)
    expect(body).toContain('**Tool:** Text Studio')
    expect(body).not.toContain('Steps to reproduce')
    expect(body).toContain('Extension version: 1.2.0')
  })

  it('uses the Edge add-ons listing in Microsoft Edge and the Chrome listing otherwise', () => {
    const userAgent = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    })
    expect(storeListingUrl()).toBe(CHROME_STORE_LISTING_URL)
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: `${navigator.userAgent} Edg/130.0.0.0`,
    })
    expect(storeListingUrl()).toBe(EDGE_STORE_LISTING_URL)
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  })

  it('keeps the issue link bounded', () => {
    const url = buildIssueUrl({ ...report, description: 'x'.repeat(20000) })
    expect(url.startsWith('https://github.com/')).toBe(true)
    expect(url.length).toBeLessThan(20000)
  })
})
