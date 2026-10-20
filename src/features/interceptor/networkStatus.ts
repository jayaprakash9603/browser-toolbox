import type { NetLogEntry } from '@/core/interceptor'

export type NetworkOutcome = 'ok' | 'aborted' | 'blocked' | 'failed'

export function networkOutcome(error?: string): NetworkOutcome {
  if (!error) return 'ok'
  if (error === 'net::ERR_ABORTED') return 'aborted'
  if (error === 'net::ERR_BLOCKED_BY_CLIENT') return 'blocked'
  return 'failed'
}

export function outcomeLabel(outcome: NetworkOutcome): string {
  switch (outcome) {
    case 'aborted':
      return '(canceled)'
    case 'blocked':
      return '(blocked)'
    case 'failed':
      return '(failed)'
    default:
      return ''
  }
}

export function statusCellClass(outcome: NetworkOutcome, status?: number): string {
  if (outcome === 'aborted' || outcome === 'blocked' || outcome === 'failed') return 'text-red-600'
  if (!status) return 'text-muted-foreground'
  if (status >= 500) return 'text-red-600'
  if (status >= 400) return 'text-amber-600'
  return ''
}

export function rowUrlClass(outcome: NetworkOutcome): string {
  if (outcome === 'aborted') return 'text-red-600'
  if (outcome === 'blocked' || outcome === 'failed') return 'text-red-600/90'
  return ''
}

export function formatStatusDisplay(entry: Pick<NetLogEntry, 'status' | 'error'>): {
  text: string
  outcome: NetworkOutcome
} {
  const outcome = networkOutcome(entry.error)
  if (outcome !== 'ok') return { text: outcomeLabel(outcome), outcome }
  if (entry.status != null) return { text: String(entry.status), outcome: 'ok' }
  return { text: '…', outcome: 'ok' }
}
