import type { AdblockState, AdblockTabEntry } from '@/core/adblock'
import type { ProtectionState, ProtectionStats } from '@/core/protection'

import { auditHeaders, type PageAuditInput } from './audit'
import { scoreFindings } from './scoring'
import type { TabSecurityContext } from './tabContext'
import type { CookieMetadata, SecurityFinding, SecurityScanReport, SitePermissionStatus } from './types'

export interface OverviewScanInput {
  context: TabSecurityContext
  protection: ProtectionState | null
  protectionStats: ProtectionStats | null
  adblock: AdblockState | null
  adblockTab: AdblockTabEntry | null
  audit?: PageAuditInput | null
  cookies?: CookieMetadata[] | null
  cookiesAvailable?: boolean
  permissions?: SitePermissionStatus[] | null
}

function finding(partial: Omit<SecurityFinding, 'timestamp'>): SecurityFinding {
  return { timestamp: Date.now(), ...partial }
}

export function buildOverviewFindings(input: OverviewScanInput): SecurityFinding[] {
  const { context } = input
  const findings: SecurityFinding[] = []
  if (context.restricted) {
    findings.push(
      finding({
        id: 'tab',
        name: 'Active website',
        category: 'connection',
        result: 'not_available',
        severity: 'info',
        evidence: context.restrictedReason ?? 'No website tab.',
        recommendation: 'Open a website tab to scan it.',
        availability: 'not_available',
        source: 'tab',
      }),
    )
    return findings
  }

  if (input.audit) findings.push(...auditHeaders(input.audit))
  else {
    findings.push(
      finding({
        id: 'https',
        name: 'HTTPS',
        category: 'connection',
        result: context.https ? 'passed' : 'failed',
        severity: 'critical',
        evidence: context.url,
        recommendation: context.https ? 'The tab URL is HTTPS.' : 'This tab is not using HTTPS.',
        availability: context.https ? 'passed' : 'failed',
        explanation: 'Certificate details are not available to this extension.',
        source: 'tab-url',
      }),
    )
  }

  const protectionOn = Boolean(input.protection?.enabled)
  findings.push(
    finding({
      id: 'protection',
      name: 'Browser protection',
      category: 'protection',
      result: protectionOn ? 'passed' : 'warning',
      severity: 'high',
      evidence: protectionOn ? 'Web Protection is enabled.' : 'Web Protection is off.',
      recommendation: protectionOn ? 'Keep threat blocking enabled for unknown sites.' : 'Enable Web Protection to block known-bad hosts.',
      availability: protectionOn ? 'passed' : 'warning',
      source: 'protection',
    }),
  )

  const privacyOn = Boolean(input.adblock?.enabled && input.adblock.lists.privacy)
  findings.push(
    finding({
      id: 'trackers-module',
      name: 'Tracking protection',
      category: 'trackers',
      result: privacyOn ? 'passed' : 'warning',
      severity: 'medium',
      evidence: privacyOn ? 'The privacy filter list is enabled.' : 'Tracker blocking is off.',
      recommendation: privacyOn ? 'Review tracker exceptions if a site is broken.' : 'Enable the privacy list in Ad Blocker or this center.',
      availability: privacyOn ? 'passed' : 'warning',
      source: 'adblock',
    }),
  )

  const blocked = input.adblockTab?.network ?? 0
  findings.push(
    finding({
      id: 'trackers-count',
      name: 'Trackers blocked on this tab',
      category: 'trackers',
      result: 'passed',
      severity: 'low',
      evidence: `${blocked} network request${blocked === 1 ? '' : 's'} matched blocking rules on this tab.`,
      recommendation: 'Blocked counts come from the filter engine, not from a live threat feed.',
      availability: 'passed',
      source: 'adblock-stats',
    }),
  )

  if (input.cookiesAvailable === false) {
    findings.push(
      finding({
        id: 'cookies',
        name: 'Cookies',
        category: 'cookies',
        result: 'not_available',
        severity: 'low',
        evidence: 'Cookie access requires the optional cookies permission.',
        recommendation: 'Grant cookie access to inspect this site’s cookies.',
        availability: 'not_available',
        source: 'cookies',
      }),
    )
  } else if (input.cookies) {
    const third = input.cookies.filter((cookie) => cookie.firstParty === false).length
    const flagged = input.cookies.filter((cookie) => cookie.observations.length).length
    findings.push(
      finding({
        id: 'cookies',
        name: 'Cookies',
        category: 'cookies',
        result: flagged ? 'warning' : 'passed',
        severity: 'low',
        evidence: `${input.cookies.length} cookies (${third} third-party). ${flagged} have informational flags.`,
        recommendation: 'Review long-lived or non-Secure cookies if they look session-related.',
        availability: flagged ? 'warning' : 'passed',
        source: 'cookies',
      }),
    )
  }

  if (input.permissions) {
    const granted = input.permissions.filter((item) => item.state === 'granted')
    findings.push(
      finding({
        id: 'permissions',
        name: 'Site permissions',
        category: 'permissions',
        result: granted.length ? 'warning' : 'passed',
        severity: granted.length ? 'medium' : 'low',
        evidence: granted.length
          ? `Granted: ${granted.map((item) => item.name).join(', ')}`
          : 'No powerful permissions are currently granted (of those the API can query).',
        recommendation: 'Review camera, microphone, location and clipboard access in site settings.',
        availability: granted.length ? 'warning' : 'passed',
        source: 'permissions',
      }),
    )
  } else {
    findings.push(
      finding({
        id: 'permissions',
        name: 'Site permissions',
        category: 'permissions',
        result: 'not_available',
        severity: 'low',
        evidence: 'Permission query did not run for this tab.',
        recommendation: 'Run a scan on an http(s) page.',
        availability: 'not_available',
        source: 'permissions',
      }),
    )
  }

  return findings
}

export function buildScanReport(input: OverviewScanInput, findings: SecurityFinding[]): SecurityScanReport {
  const scored = scoreFindings(findings)
  const thirdPartyCookies =
    input.cookiesAvailable === false ? null : (input.cookies?.filter((cookie) => cookie.firstParty === false).length ?? null)
  return {
    id: `scan-${input.context.tabId ?? 0}-${Date.now()}`,
    url: input.context.url,
    domain: input.context.domain || input.context.hostname,
    https: input.context.https,
    restricted: input.context.restricted,
    timestamp: Date.now(),
    score: scored.score,
    scoreExplanation: scored.explanation,
    findings,
    completedChecks: scored.completed,
    applicableChecks: scored.applicable,
    trackersBlocked: input.adblockTab?.network ?? 0,
    trackersDetected: 0,
    thirdPartyCookies,
    protectionEnabled: Boolean(input.protection?.enabled),
    adblockEnabled: Boolean(input.adblock?.enabled),
  }
}

export function exportScanReport(report: SecurityScanReport): string {
  return JSON.stringify(report, null, 2)
}

export function exportScanReportMarkdown(report: SecurityScanReport): string {
  const lines = [
    `# Security scan — ${report.domain || 'unknown host'}`,
    '',
    `- URL: ${report.url}`,
    `- When: ${new Date(report.timestamp).toISOString()}`,
    `- Score: ${report.score ?? 'n/a'} (${report.completedChecks} completed checks)`,
    `- ${report.scoreExplanation}`,
    '',
    '## Findings',
    ...report.findings.map(
      (finding) =>
        `- **${finding.name}** — ${finding.result} (${finding.severity}): ${finding.evidence}`,
    ),
  ]
  return lines.join('\n')
}
