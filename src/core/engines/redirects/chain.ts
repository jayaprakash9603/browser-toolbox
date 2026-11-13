import type { LinkCheckResult, RedirectHop } from '@/core/engines/linkChecker/check'

const PERMANENT = new Set([301, 308])
const TEMPORARY = new Set([302, 303, 307])

export type RedirectKind = 'direct' | 'permanent' | 'temporary' | 'mixed' | 'loop' | 'error'
export type RedirectFlag = 'httpsUpgrade' | 'httpsDowngrade' | 'wwwChange' | 'hostChange' | 'pathChange' | 'queryChange'
export type RedirectFilter = 'all' | 'redirects' | 'direct' | 'permanent' | 'temporary' | 'loops' | 'errors'
export type RedirectPhase = 'queued' | 'checking' | 'done'
export type RedirectSource = 'page' | 'link' | 'manual'
export type HopClass = 'permanent' | 'temporary' | 'final' | 'error'

export const REDIRECT_FILTERS: RedirectFilter[] = [
  'all',
  'redirects',
  'permanent',
  'temporary',
  'loops',
  'errors',
  'direct',
]

export interface RedirectTraceView {
  hops: RedirectHop[]
  finalUrl: string
  status: number | null
  redirected: boolean
  loop: boolean
  timedOut?: boolean
  error?: string
  durationMs: number
  kind: RedirectKind
  flags: RedirectFlag[]
}

export interface RedirectTarget {
  url: string
  text: string
  kind: 'internal' | 'external' | 'other'
  host: string
  source: RedirectSource
  occurrences: { index: number; href: string; visible: boolean }[]
}

export interface RedirectEntry {
  target: RedirectTarget
  phase: RedirectPhase
  trace?: RedirectTraceView
}

export interface RedirectSummary {
  scanned: number
  redirects: number
  loops: number
  direct: number
  errors: number
}

type TraceInput = Pick<
  LinkCheckResult,
  'hops' | 'loop' | 'finalUrl' | 'status' | 'redirected' | 'timedOut' | 'error' | 'durationMs'
> & { href: string }

function parseUrl(href: string): URL | null {
  try {
    return new URL(href)
  } catch {
    return null
  }
}

export function isRedirectStatus(status: number | null | undefined): boolean {
  return status != null && status >= 300 && status < 400 && status !== 304
}

export function hopClass(status: number | null | undefined): HopClass {
  if (status == null) return 'error'
  if (PERMANENT.has(status)) return 'permanent'
  if (TEMPORARY.has(status)) return 'temporary'
  if (status >= 200 && status < 400) return 'final'
  return 'error'
}

export function classifyKind(
  result: Pick<LinkCheckResult, 'hops' | 'loop' | 'timedOut' | 'error' | 'redirected' | 'status'>,
): RedirectKind {
  if (result.loop) return 'loop'
  if (result.timedOut || result.error) return 'error'
  if (result.status == null) return 'error'
  if (result.status >= 400) return 'error'
  if (!result.redirected) return 'direct'
  const codes = (result.hops ?? []).map((hop) => hop.status).filter((status): status is number => isRedirectStatus(status))
  const permanent = codes.some((code) => PERMANENT.has(code))
  const temporary = codes.some((code) => TEMPORARY.has(code))
  if (permanent && temporary) return 'mixed'
  if (temporary && !permanent) return 'temporary'
  return 'permanent'
}

export function collectFlags(from: string, to: string): RedirectFlag[] {
  const start = parseUrl(from)
  const end = parseUrl(to)
  if (!start || !end) return []
  const flags: RedirectFlag[] = []
  if (start.protocol === 'http:' && end.protocol === 'https:') flags.push('httpsUpgrade')
  if (start.protocol === 'https:' && end.protocol === 'http:') flags.push('httpsDowngrade')
  const startBare = start.hostname.replace(/^www\./i, '').toLowerCase()
  const endBare = end.hostname.replace(/^www\./i, '').toLowerCase()
  if (startBare !== endBare) flags.push('hostChange')
  else if (start.hostname.toLowerCase() !== end.hostname.toLowerCase()) flags.push('wwwChange')
  if (start.pathname !== end.pathname) flags.push('pathChange')
  if (start.search !== end.search) flags.push('queryChange')
  return flags
}

export function displayHref(href: string): { host: string; path: string } {
  const url = parseUrl(href)
  if (!url) return { host: '', path: href }
  const path = `${url.pathname === '/' && !url.search && !url.hash ? '' : url.pathname}${url.search}${url.hash}`
  let decoded = path
  try {
    decoded = decodeURI(path)
  } catch {
    // Keep malformed escapes as written.
  }
  return { host: url.host.replace(/^www\./, ''), path: decoded }
}

export function toTraceView(result: TraceInput): RedirectTraceView {
  const hops = result.hops?.length ? result.hops : [{ url: result.href, status: result.status }]
  const finalUrl = result.finalUrl || hops.at(-1)?.url || result.href
  return {
    hops,
    finalUrl,
    status: result.status,
    redirected: Boolean(result.redirected),
    loop: Boolean(result.loop),
    timedOut: result.timedOut,
    error: result.error,
    durationMs: result.durationMs ?? hops.reduce((sum, hop) => sum + (hop.durationMs ?? 0), 0),
    kind: classifyKind(result),
    flags: collectFlags(result.href, finalUrl),
  }
}

export function isBrokenTrace(trace: RedirectTraceView): boolean {
  return Boolean(trace.error || trace.timedOut || trace.status == null || trace.status >= 400)
}

export function matchesFilter(entry: RedirectEntry, filter: RedirectFilter): boolean {
  if (entry.phase !== 'done' || !entry.trace) return filter === 'all'
  const { kind, redirected, loop } = entry.trace
  const broken = isBrokenTrace(entry.trace)
  switch (filter) {
    case 'all':
      return true
    case 'redirects':
      return redirected || loop
    case 'direct':
      return !redirected && !loop && !broken
    case 'permanent':
      return kind === 'permanent'
    case 'temporary':
      return kind === 'temporary' || kind === 'mixed'
    case 'loops':
      return loop
    case 'errors':
      return broken
  }
}

export function summarizeEntries(entries: Iterable<RedirectEntry>): RedirectSummary {
  const summary: RedirectSummary = { scanned: 0, redirects: 0, loops: 0, direct: 0, errors: 0 }
  for (const entry of entries) {
    if (entry.phase !== 'done' || !entry.trace) continue
    summary.scanned += 1
    if (entry.trace.loop) summary.loops += 1
    if (entry.trace.redirected) summary.redirects += 1
    else if (!isBrokenTrace(entry.trace)) summary.direct += 1
    if (isBrokenTrace(entry.trace)) summary.errors += 1
  }
  return summary
}

export function filterCounts(entries: Iterable<RedirectEntry>): Record<RedirectFilter, number> {
  const counts: Record<RedirectFilter, number> = {
    all: 0,
    redirects: 0,
    direct: 0,
    permanent: 0,
    temporary: 0,
    loops: 0,
    errors: 0,
  }
  for (const entry of entries) {
    if (entry.phase !== 'done' || !entry.trace) continue
    counts.all += 1
    for (const filter of REDIRECT_FILTERS) {
      if (filter !== 'all' && matchesFilter(entry, filter)) counts[filter] += 1
    }
  }
  return counts
}

export function matchesQuery(entry: RedirectEntry, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = [
    entry.target.text,
    entry.target.url,
    entry.target.host,
    entry.trace?.finalUrl ?? '',
    ...(entry.trace?.hops.map((hop) => hop.url) ?? []),
  ]
    .join(' ')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export function formatChainText(entry: RedirectEntry): string {
  const hops = entry.trace?.hops ?? [{ url: entry.target.url, status: null }]
  const lines = hops.map((hop, index) => `${index + 1}. ${hop.status ?? '—'} ${hop.url}`)
  if (entry.trace?.loop) lines.push('Loop detected')
  if (entry.trace?.error) lines.push(entry.trace.error)
  return lines.join('\n')
}

export function formatRedirectList(entries: Iterable<RedirectEntry>): string {
  const lines: string[] = []
  for (const entry of entries) {
    if (entry.phase !== 'done' || !entry.trace?.redirected) continue
    lines.push(`${entry.target.url} → ${entry.trace.finalUrl}`)
  }
  return lines.join('\n')
}

export function sortEntries(entries: RedirectEntry[]): RedirectEntry[] {
  const rank: Record<RedirectKind, number> = {
    loop: 0,
    error: 1,
    mixed: 2,
    permanent: 3,
    temporary: 4,
    direct: 5,
  }
  return [...entries].sort((left, right) => {
    const leftKind = left.trace?.kind ?? 'direct'
    const rightKind = right.trace?.kind ?? 'direct'
    if (rank[leftKind] !== rank[rightKind]) return rank[leftKind] - rank[rightKind]
    const leftHops = left.trace?.hops.length ?? 0
    const rightHops = right.trace?.hops.length ?? 0
    if (leftHops !== rightHops) return rightHops - leftHops
    return left.target.url.localeCompare(right.target.url)
  })
}
