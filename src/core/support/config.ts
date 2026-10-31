export const SUPPORT_EMAIL = 'contact@quickcalci.com'

export const STORE_LISTING_URL =
  'https://chromewebstore.google.com/detail/one-panel/ppanklldbegjgaalfliiicologfoggfo'

export const ISSUE_TRACKER_URL = 'https://github.com/jayaprakash9603/browser-toolbox/issues/new'

export const FEEDBACK_SUBJECT = 'One Panel — Feedback'

const MAX_ISSUE_URL_BODY = 6000

export interface IssueReport {
  title: string
  toolName: string
  description: string
  steps: string
  diagnostics: string
}

export function buildReportBody(report: IssueReport): string {
  const sections = [
    `**Tool:** ${report.toolName}`,
    `**Description**\n${report.description.trim()}`,
    report.steps.trim() ? `**Steps to reproduce**\n${report.steps.trim()}` : '',
    report.diagnostics.trim() ? `**Diagnostics**\n${report.diagnostics.trim()}` : '',
  ]
  return sections.filter(Boolean).join('\n\n')
}

export function buildIssueUrl(report: IssueReport): string {
  const params = new URLSearchParams({
    title: report.title.trim(),
    body: buildReportBody(report).slice(0, MAX_ISSUE_URL_BODY),
  })
  return `${ISSUE_TRACKER_URL}?${params.toString()}`
}

export function buildMailtoUrl(subject: string, body = ''): string {
  const query = [`subject=${encodeURIComponent(subject)}`]
  if (body) query.push(`body=${encodeURIComponent(body)}`)
  return `mailto:${SUPPORT_EMAIL}?${query.join('&')}`
}

export function formatDiagnostics(input: {
  version: string
  userAgent: string
  route: string
  theme: string
}): string {
  return [
    `Extension version: ${input.version}`,
    `Browser: ${input.userAgent}`,
    `Panel route: ${input.route}`,
    `Theme: ${input.theme}`,
  ].join('\n')
}
