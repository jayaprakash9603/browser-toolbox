export type LinkCheckMethod = 'auto' | 'get'

export interface LinkCheckRequestOptions {
  timeoutMs?: number
  /** `auto` sends HEAD first and confirms failures with GET; `get` always sends GET. */
  method?: LinkCheckMethod
}

export type LinkCheckResult = {
  href: string
  text: string
  status: number | null
  ok: boolean
  error?: string
  finalUrl?: string
  redirected?: boolean
  durationMs?: number
  method?: 'HEAD' | 'GET'
  timedOut?: boolean
}

export const DEFAULT_CHECK_TIMEOUT_MS = 10_000
export const MAX_CHECK_TIMEOUT_MS = 60_000

export function isBrokenStatus(status: number | null): boolean {
  if (status == null) return true
  return status >= 400 || status === 0
}

export function summarizeResults(results: LinkCheckResult[]): { total: number; broken: number } {
  const broken = results.filter((r) => !r.ok).length
  return { total: results.length, broken }
}

export function clampTimeout(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_CHECK_TIMEOUT_MS
  return Math.min(MAX_CHECK_TIMEOUT_MS, Math.max(1_000, Math.round(value)))
}
