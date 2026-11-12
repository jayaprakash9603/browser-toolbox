import type { RedirectLogEntry, RedirectVerdict } from './types'
import { MAX_REDIRECT_LOG_ENTRIES } from './constants'
import { hostOfHttpUrl } from './privacy'

export function buildLogEntry(
  params: {
    sourceUrl?: string
    destUrl: string
    transitionType?: string
    tabId: number
    at: number
  },
  verdict: RedirectVerdict,
): RedirectLogEntry {
  return {
    id: `${params.tabId}-${params.at}`,
    sourceHost: hostOfHttpUrl(params.sourceUrl) ?? '',
    destHost: hostOfHttpUrl(params.destUrl) ?? '',
    redirectType: params.transitionType ?? 'unknown',
    classification: verdict.classification,
    risk: verdict.risk,
    score: verdict.score,
    reasons: verdict.reasons,
    action: verdict.action,
    tabId: params.tabId,
    at: params.at,
  }
}

export function appendRedirectLog(
  entries: RedirectLogEntry[],
  entry: RedirectLogEntry,
): RedirectLogEntry[] {
  return [entry, ...entries].slice(0, MAX_REDIRECT_LOG_ENTRIES)
}

export function markLogFalsePositive(entries: RedirectLogEntry[], id: string): RedirectLogEntry[] {
  return entries.map((e) => (e.id === id ? { ...e, falsePositive: true } : e))
}
