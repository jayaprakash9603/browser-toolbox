import type { CheckCategory, CheckResult, SecurityFinding, SecuritySeverity } from './types'

const RESULT_SCORE: Record<CheckResult, number | null> = {
  passed: 100,
  warning: 60,
  failed: 15,
  not_checked: null,
  not_available: null,
}

const SEVERITY_WEIGHT: Record<SecuritySeverity, number> = {
  info: 0.6,
  low: 0.8,
  medium: 1,
  high: 1.4,
  critical: 1.8,
}

export function isCompletedCheck(finding: SecurityFinding): boolean {
  return finding.result === 'passed' || finding.result === 'warning' || finding.result === 'failed'
}

export function scoreFindings(findings: SecurityFinding[]): {
  score: number | null
  completed: number
  applicable: number
  explanation: string
} {
  const applicable = findings.filter((finding) => finding.result !== 'not_available')
  const completed = applicable.filter(isCompletedCheck)
  if (!completed.length) {
    return {
      score: null,
      completed: 0,
      applicable: applicable.length,
      explanation: 'No applicable checks have finished yet. The score only uses completed checks.',
    }
  }

  let weighted = 0
  let weights = 0
  for (const finding of completed) {
    const raw = RESULT_SCORE[finding.result]
    if (raw == null) continue
    const weight = SEVERITY_WEIGHT[finding.severity]
    weighted += raw * weight
    weights += weight
  }
  const score = weights === 0 ? null : Math.round(weighted / weights)
  const failed = completed.filter((finding) => finding.result === 'failed').length
  const warnings = completed.filter((finding) => finding.result === 'warning').length
  const passed = completed.filter((finding) => finding.result === 'passed').length
  const unavailable = findings.filter((finding) => finding.result === 'not_available').length

  const explanation = [
    `Score ${score ?? '—'}/100 from ${completed.length} completed check${completed.length === 1 ? '' : 's'}`,
    `(${passed} passed, ${warnings} warning${warnings === 1 ? '' : 's'}, ${failed} failed).`,
    unavailable ? `${unavailable} check${unavailable === 1 ? ' was' : 's were'} not available and ${unavailable === 1 ? 'was' : 'were'} excluded.` : '',
    'Absence of a detected threat is not a guarantee that the site is safe.',
  ]
    .filter(Boolean)
    .join(' ')

  return { score, completed: completed.length, applicable: applicable.length, explanation }
}

export function categoryBreakdown(
  findings: SecurityFinding[],
): Record<CheckCategory, { score: number | null; completed: number }> {
  const groups = {} as Record<CheckCategory, { score: number | null; completed: number }>
  for (const category of [
    'connection',
    'protection',
    'privacy',
    'trackers',
    'headers',
    'resources',
    'permissions',
    'cookies',
  ] as const) {
    const scored = scoreFindings(findings.filter((finding) => finding.category === category))
    groups[category] = { score: scored.score, completed: scored.completed }
  }
  return groups
}

export function postureLabel(score: number | null, completed: number): string {
  if (score == null || completed === 0) return 'Not scored'
  if (score >= 90) return 'Strong observations'
  if (score >= 75) return 'Mostly protected'
  if (score >= 50) return 'Needs attention'
  return 'High risk observations'
}
