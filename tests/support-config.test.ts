import { describe, expect, it } from 'vitest'

import {
  FEEDBACK_SUBJECT,
  SUPPORT_EMAIL,
  buildIssueUrl,
  buildMailtoUrl,
  buildReportBody,
  formatDiagnostics,
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

  it('keeps the issue link bounded', () => {
    const url = buildIssueUrl({ ...report, description: 'x'.repeat(20000) })
    expect(url.startsWith('https://github.com/')).toBe(true)
    expect(url.length).toBeLessThan(20000)
  })
})
