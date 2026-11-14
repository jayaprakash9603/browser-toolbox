import type { SecurityFinding } from './types'

export const AUDIT_HEADER_SPECS: Array<{
  header: string
  name: string
  id: string
  severityMissing: SecurityFinding['severity']
  why: string
  remediation: string
}> = [
  {
    header: 'strict-transport-security',
    name: 'Strict-Transport-Security',
    id: 'hsts',
    severityMissing: 'high',
    why: 'Without HSTS, browsers may still try plain HTTP on later visits.',
    remediation: 'Send Strict-Transport-Security with a long max-age (at least 15552000).',
  },
  {
    header: 'content-security-policy',
    name: 'Content-Security-Policy',
    id: 'csp',
    severityMissing: 'high',
    why: 'CSP limits which scripts and frames a page may load.',
    remediation: 'Add a Content-Security-Policy that avoids overly broad script-src values.',
  },
  {
    header: 'x-content-type-options',
    name: 'X-Content-Type-Options',
    id: 'xcto',
    severityMissing: 'medium',
    why: 'nosniff stops the browser guessing a different content type.',
    remediation: 'Send X-Content-Type-Options: nosniff.',
  },
  {
    header: 'referrer-policy',
    name: 'Referrer-Policy',
    id: 'referrer',
    severityMissing: 'low',
    why: 'A referrer policy reduces URL leakage to third parties.',
    remediation: 'Send Referrer-Policy: strict-origin-when-cross-origin or stricter.',
  },
  {
    header: 'permissions-policy',
    name: 'Permissions-Policy',
    id: 'permissions-policy',
    severityMissing: 'low',
    why: 'Locks powerful features such as camera and geolocation.',
    remediation: 'Send Permissions-Policy to disable unused powerful APIs.',
  },
  {
    header: 'x-frame-options',
    name: 'X-Frame-Options',
    id: 'xfo',
    severityMissing: 'medium',
    why: 'Helps prevent clickjacking when CSP frame-ancestors is also missing.',
    remediation: 'Send X-Frame-Options: DENY or SAMEORIGIN, or CSP frame-ancestors.',
  },
  {
    header: 'cross-origin-opener-policy',
    name: 'Cross-Origin-Opener-Policy',
    id: 'coop',
    severityMissing: 'info',
    why: 'Isolates the browsing context from cross-origin popups.',
    remediation: 'Consider Cross-Origin-Opener-Policy: same-origin.',
  },
  {
    header: 'cross-origin-resource-policy',
    name: 'Cross-Origin-Resource-Policy',
    id: 'corp',
    severityMissing: 'info',
    why: 'Restricts which other origins can load this resource.',
    remediation: 'Consider Cross-Origin-Resource-Policy: same-origin or same-site.',
  },
  {
    header: 'cross-origin-embedder-policy',
    name: 'Cross-Origin-Embedder-Policy',
    id: 'coep',
    severityMissing: 'info',
    why: 'Required together with COOP for some cross-origin isolation features.',
    remediation: 'Only set COEP if you need cross-origin isolation.',
  },
]

export interface PageAuditInput {
  url: string
  https: boolean
  headers: Record<string, string>
  headersAvailable: boolean
  mixedContent: string[]
  scripts: string[]
  stylesheets: string[]
  thirdPartyHosts: string[]
  sriMissing: number
}

function finding(partial: Omit<SecurityFinding, 'timestamp'> & { timestamp?: number }): SecurityFinding {
  return { timestamp: Date.now(), ...partial }
}

function headerMap(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) out[key.toLowerCase()] = value
  return out
}

export function auditHeaders(input: PageAuditInput): SecurityFinding[] {
  const now = Date.now()
  const headers = headerMap(input.headers)
  const findings: SecurityFinding[] = []

  findings.push(
    finding({
      id: 'https',
      name: 'HTTPS',
      category: 'connection',
      result: input.https ? 'passed' : 'failed',
      severity: 'critical',
      evidence: input.url,
      recommendation: input.https ? 'The page loaded over HTTPS.' : 'Open the site over HTTPS when available.',
      availability: 'passed',
      explanation: 'Taken from the active tab URL. Certificate details are not exposed to extensions.',
      source: 'tab-url',
      timestamp: now,
    }),
  )

  if (!input.headersAvailable) {
    for (const spec of AUDIT_HEADER_SPECS) {
      findings.push(
        finding({
          id: spec.id,
          name: spec.name,
          category: 'headers',
          result: 'not_available',
          severity: spec.severityMissing,
          evidence: 'Response headers were not readable for this document.',
          recommendation: spec.remediation,
          availability: 'not_available',
          explanation: spec.why,
          source: 'headers',
          timestamp: now,
        }),
      )
    }
    return findings
  }

  const csp = headers['content-security-policy']
  const frameAncestors = csp?.toLowerCase().includes('frame-ancestors')

  for (const spec of AUDIT_HEADER_SPECS) {
    const value = headers[spec.header]
    if (spec.id === 'xfo' && !value && frameAncestors) {
      findings.push(
        finding({
          id: spec.id,
          name: spec.name,
          category: 'headers',
          result: 'passed',
          severity: 'medium',
          evidence: 'CSP frame-ancestors is present.',
          recommendation: spec.remediation,
          availability: 'passed',
          explanation: spec.why,
          source: 'headers',
          timestamp: now,
        }),
      )
      continue
    }
    if (!value) {
      findings.push(
        finding({
          id: spec.id,
          name: spec.name,
          category: 'headers',
          result: spec.severityMissing === 'info' ? 'warning' : 'warning',
          severity: spec.severityMissing,
          evidence: `Header ${spec.name} was not observed.`,
          recommendation: spec.remediation,
          availability: 'warning',
          explanation: `${spec.why} Missing optional headers are observations, not confirmed vulnerabilities.`,
          source: 'headers',
          timestamp: now,
        }),
      )
      continue
    }
    if (spec.id === 'hsts') {
      const maxAge = /max-age=(\d+)/i.exec(value)
      const age = maxAge ? Number(maxAge[1]) : 0
      const weak = age > 0 && age < 15_552_000
      findings.push(
        finding({
          id: spec.id,
          name: spec.name,
          category: 'headers',
          result: weak ? 'warning' : 'passed',
          severity: weak ? 'medium' : 'high',
          evidence: value.slice(0, 180),
          recommendation: spec.remediation,
          availability: weak ? 'warning' : 'passed',
          explanation: spec.why,
          source: 'headers',
          timestamp: now,
        }),
      )
      continue
    }
    if (spec.id === 'csp' && /unsafe-inline|unsafe-eval|\*/i.test(value)) {
      findings.push(
        finding({
          id: spec.id,
          name: spec.name,
          category: 'headers',
          result: 'warning',
          severity: 'medium',
          evidence: value.slice(0, 220),
          recommendation: 'Tighten CSP; avoid unsafe-inline and wildcards where possible.',
          availability: 'warning',
          explanation: spec.why,
          source: 'headers',
          timestamp: now,
        }),
      )
      continue
    }
    findings.push(
      finding({
        id: spec.id,
        name: spec.name,
        category: 'headers',
        result: 'passed',
        severity: spec.severityMissing,
        evidence: value.slice(0, 220),
        recommendation: spec.remediation,
        availability: 'passed',
        explanation: spec.why,
        source: 'headers',
        timestamp: now,
      }),
    )
  }

  if (input.https && input.mixedContent.length) {
    findings.push(
      finding({
        id: 'mixed',
        name: 'Mixed content',
        category: 'resources',
        result: 'warning',
        severity: 'medium',
        evidence: input.mixedContent.slice(0, 5).join('\n'),
        recommendation: 'Serve every page resource over HTTPS.',
        availability: 'warning',
        explanation: 'HTTP URLs were found in the document on an HTTPS page.',
        source: 'dom',
        timestamp: now,
      }),
    )
  } else if (input.https) {
    findings.push(
      finding({
        id: 'mixed',
        name: 'Mixed content',
        category: 'resources',
        result: 'passed',
        severity: 'medium',
        evidence: 'No http:// resources were observed in the scanned document tags.',
        recommendation: 'Keep all subresources on HTTPS.',
        availability: 'passed',
        source: 'dom',
        timestamp: now,
      }),
    )
  }

  if (input.sriMissing > 0) {
    findings.push(
      finding({
        id: 'sri',
        name: 'Subresource Integrity',
        category: 'resources',
        result: 'warning',
        severity: 'low',
        evidence: `${input.sriMissing} third-party script(s) without an integrity attribute.`,
        recommendation: 'Add integrity hashes on third-party scripts when the CDN supports them.',
        availability: 'warning',
        source: 'dom',
        timestamp: now,
      }),
    )
  }

  return findings
}

export function formatRawHeaders(headers: Record<string, string>, available: boolean): string {
  if (!available) return '# Response headers were not available for this document.'
  return Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}
