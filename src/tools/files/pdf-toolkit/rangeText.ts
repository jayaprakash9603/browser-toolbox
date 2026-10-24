import type { TFunction } from 'i18next'

import { parsePageSelection, type PageRangeIssue } from '@/core/engines/pdf/ranges'

export function rangeIssueMessage(t: TFunction, issue: PageRangeIssue): string {
  if (issue.kind === 'syntax') return t('pdf.range.syntax', { token: issue.token })
  if (issue.kind === 'outOfRange') return t('pdf.range.outOfRange', { token: issue.token, total: issue.total })
  return t('pdf.range.empty')
}

/** Pages chosen in an optional range box; an empty box means every page. */
export function optionalSelection(input: string, total: number): { ok: true; pages: number[] } | { ok: false; issue: PageRangeIssue } {
  if (!input.trim()) return { ok: true, pages: Array.from({ length: total }, (_, index) => index) }
  const result = parsePageSelection(input, total)
  return result.ok ? { ok: true, pages: result.groups[0] ?? [] } : result
}
