import type { LinkCheckResult } from '@/core/engines/linkChecker/check'

import type { BookmarkHealthRecord, HealthKind } from './model'
import { canonicalizeBookmarkUrl, isHttpUrl, stripSensitiveParams } from './urls'

export function classifyHealthResult(result: LinkCheckResult): HealthKind {
  if (!isHttpUrl(result.href)) return 'invalid'
  if (result.timedOut) return 'timeout'
  if (result.status === 401 || result.status === 403) return 'auth'
  if (result.status === 407 || result.status === 451) return 'blocked'
  if (result.redirected && result.status != null && result.status < 400) return 'redirect'
  if (result.status != null && result.status >= 400) return 'broken'
  if (result.status != null && result.status < 400) return 'ok'
  if (result.error && /block|cors|net::err_blocked/i.test(result.error)) return 'blocked'
  return 'network'
}

export function healthRecordFrom(result: LinkCheckResult, now = Date.now()): BookmarkHealthRecord {
  return {
    checkedAt: now,
    httpStatus: result.status,
    kind: classifyHealthResult(result),
    finalUrl: result.finalUrl,
    error: result.error,
  }
}

export function healthCacheKey(url: string): string {
  return canonicalizeBookmarkUrl(url)
}

export function scanUrlForCheck(url: string): string {
  return stripSensitiveParams(url)
}

export function shouldRecheck(
  record: BookmarkHealthRecord | undefined,
  now = Date.now(),
  ttlMs = 6 * 60 * 60 * 1000,
): boolean {
  if (!record) return true
  return now - record.checkedAt >= ttlMs
}

export function isConfirmedBroken(kind: HealthKind): boolean {
  return kind === 'broken' || kind === 'invalid'
}

export function isInconclusive(kind: HealthKind): boolean {
  return kind === 'timeout' || kind === 'network' || kind === 'blocked' || kind === 'auth'
}
