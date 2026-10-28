import { A11Y_CATEGORIES, A11Y_RULES } from './rules'
import type {
  A11yCategorySummary,
  A11yPageScan,
  A11yReport,
  A11yReportFilter,
  A11yRuleId,
  A11yRuleOutcome,
  A11ySeverity,
} from './types'

const WEIGHT: Record<A11ySeverity, number> = { error: 10, warning: 4, notice: 0 }
const SEVERITY_ORDER: Record<A11ySeverity, number> = { error: 0, warning: 1, notice: 2 }

export const DEFAULT_REPORT_FILTER: A11yReportFilter = { includeAAA: false, includeNotices: true }

/** Any failure costs at least half the rule's weight; the rest scales with how many elements fail. */
function ruleCredit(outcome: A11yRuleOutcome): number {
  if (outcome.status !== 'fail') return 1
  if (outcome.checked <= 1) return 0
  return 0.5 * Math.max(0, 1 - outcome.failed / outcome.checked)
}

function scoreOf(outcomes: A11yRuleOutcome[]): number {
  let total = 0
  let earned = 0
  for (const outcome of outcomes) {
    const weight = WEIGHT[outcome.severity]
    if (outcome.status === 'na' || weight === 0) continue
    total += weight
    earned += weight * ruleCredit(outcome)
  }
  return total === 0 ? 100 : Math.round((earned / total) * 100)
}

function included(meta: A11yRuleOutcome, filter: A11yReportFilter): boolean {
  if (!filter.includeAAA && meta.level === 'AAA') return false
  if (!filter.includeNotices && meta.severity === 'notice') return false
  return true
}

export function buildA11yReport(scan: A11yPageScan, filter: A11yReportFilter = DEFAULT_REPORT_FILTER): A11yReport {
  const scanned = new Map(scan.rules.map((result) => [result.id, result]))
  const outcomes: A11yRuleOutcome[] = []
  for (const meta of A11Y_RULES) {
    const result = scanned.get(meta.id) ?? { id: meta.id, checked: 0, failed: 0, nodes: [] }
    const status = result.failed > 0 ? 'fail' : result.checked > 0 ? 'pass' : 'na'
    const outcome: A11yRuleOutcome = { ...meta, ...result, status }
    if (included(outcome, filter)) outcomes.push(outcome)
  }
  outcomes.sort(
    (a, b) =>
      Number(b.status === 'fail') - Number(a.status === 'fail') ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.failed - a.failed,
  )

  const categories: A11yCategorySummary[] = A11Y_CATEGORIES.map((id) => {
    const inCategory = outcomes.filter((o) => o.category === id)
    const failing = inCategory.filter((o) => o.status === 'fail')
    return {
      id,
      failed: failing.length,
      passed: inCategory.filter((o) => o.status === 'pass').length,
      errors: failing.filter((o) => o.severity === 'error').length,
      warnings: failing.filter((o) => o.severity === 'warning').length,
      notices: failing.filter((o) => o.severity === 'notice').length,
      score: scoreOf(inCategory),
    }
  })

  const failing = outcomes.filter((o) => o.status === 'fail')
  return {
    scan,
    outcomes,
    categories,
    score: scoreOf(outcomes),
    counts: {
      errors: failing.filter((o) => o.severity === 'error').length,
      warnings: failing.filter((o) => o.severity === 'warning').length,
      notices: failing.filter((o) => o.severity === 'notice').length,
      passed: outcomes.filter((o) => o.status === 'pass').length,
      elements: failing.reduce((sum, o) => sum + o.failed, 0),
    },
  }
}

export type A11yGrade = 'great' | 'good' | 'fair' | 'poor'

export function gradeFor(score: number): A11yGrade {
  if (score >= 90) return 'great'
  if (score >= 75) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}

export interface A11yReportText {
  ruleTitle: (id: A11yRuleId) => string
  ruleFix: (id: A11yRuleId) => string
}

const SEVERITY_HEADINGS: Record<A11ySeverity, string> = {
  error: 'Errors',
  warning: 'Warnings',
  notice: 'Notices',
}

export function reportToMarkdown(report: A11yReport, text: A11yReportText, date = new Date()): string {
  const { scan, counts } = report
  const lines = [
    `# Accessibility report: ${scan.title || scan.url}`,
    '',
    `- URL: ${scan.url}`,
    `- Checked: ${date.toISOString()}`,
    `- Score: **${report.score}/100**`,
    `- ${counts.errors} errors · ${counts.warnings} warnings · ${counts.notices} notices · ${counts.passed} checks passed`,
  ]
  for (const severity of ['error', 'warning', 'notice'] as const) {
    const failing = report.outcomes.filter((o) => o.status === 'fail' && o.severity === severity)
    if (failing.length === 0) continue
    lines.push('', `## ${SEVERITY_HEADINGS[severity]}`)
    for (const outcome of failing) {
      const refs = [...outcome.wcag.map((c) => `WCAG ${c}`), outcome.level === 'best' ? 'Best practice' : `Level ${outcome.level}`]
      lines.push('', `### ${text.ruleTitle(outcome.id)} (${outcome.failed})`, '', `_${refs.join(' · ')}_`, '', text.ruleFix(outcome.id), '')
      for (const node of outcome.nodes) {
        const target = node.selector ? `\`${node.selector}\`` : 'Page'
        lines.push(`- [ ] ${target}${node.detail ? ` — ${node.detail}` : ''}`)
      }
      const hidden = outcome.failed - outcome.nodes.length
      if (hidden > 0) lines.push(`- …and ${hidden} more`)
    }
  }
  return `${lines.join('\n')}\n`
}

export function reportToJson(report: A11yReport): string {
  return JSON.stringify(
    {
      url: report.scan.url,
      title: report.scan.title,
      score: report.score,
      counts: report.counts,
      stats: report.scan.stats,
      issues: report.outcomes
        .filter((o) => o.status === 'fail')
        .map(({ id, category, severity, level, wcag, failed, checked, nodes }) => ({
          id,
          category,
          severity,
          level,
          wcag,
          failed,
          checked,
          nodes,
        })),
      passed: report.outcomes.filter((o) => o.status === 'pass').map((o) => o.id),
    },
    null,
    2,
  )
}

export function allRuleIds(): A11yRuleId[] {
  return A11Y_RULES.map((meta) => meta.id)
}
