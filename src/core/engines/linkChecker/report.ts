import { bareHost, type PageLink } from '@/core/engines/links/pageLinks'

import { clampTimeout, DEFAULT_CHECK_TIMEOUT_MS, type LinkCheckMethod, type LinkCheckResult } from './check'

export type LinkHealth = 'broken' | 'server' | 'timeout' | 'network' | 'blocked' | 'redirect' | 'ok'
export type CheckScope = 'all' | 'internal' | 'external'
export type HealthFilter = 'all' | 'problems' | LinkHealth
export type SortKey = 'severity' | 'page' | 'slowest' | 'url'
export type GroupKey = 'none' | 'status' | 'site'
export type Speed = 'fast' | 'moderate' | 'slow'
export type HealthGrade = 'healthy' | 'fair' | 'poor'

/** Most severe first; also the order of the breakdown bar and filter chips. */
export const HEALTH_ORDER: LinkHealth[] = ['broken', 'server', 'timeout', 'network', 'blocked', 'redirect', 'ok']
export const HEALTH_FILTERS: HealthFilter[] = ['all', 'problems', ...HEALTH_ORDER]
export const CHECK_SCOPES: CheckScope[] = ['all', 'internal', 'external']
export const SORT_KEYS: SortKey[] = ['severity', 'page', 'slowest', 'url']
export const GROUP_KEYS: GroupKey[] = ['none', 'status', 'site']
export const TIMEOUT_CHOICES = [5_000, 10_000, 20_000, 30_000] as const
export const CONCURRENCY_CHOICES = [2, 4, 6, 10] as const
export const MAX_TARGETS = 600

/** Sites that answer extension requests with these codes usually need a login or block bots. */
const BLOCKED_STATUSES = new Set([401, 403, 407, 429, 999])
const FAST_MS = 700
const SLOW_MS = 2_000

export interface CheckSettings {
  scope: CheckScope
  timeoutMs: number
  concurrency: number
  method: LinkCheckMethod
  includeFiles: boolean
  retryFailures: boolean
  redirectsAsIssues: boolean
  /** Kept as typed so line breaks survive editing. */
  skipText: string
}

export const DEFAULT_CHECK_SETTINGS: CheckSettings = {
  scope: 'all',
  timeoutMs: DEFAULT_CHECK_TIMEOUT_MS,
  concurrency: 6,
  method: 'auto',
  includeFiles: true,
  retryFailures: true,
  redirectsAsIssues: false,
  skipText: '',
}

export function normalizeSettings(value: unknown): CheckSettings {
  if (!value || typeof value !== 'object') return DEFAULT_CHECK_SETTINGS
  const raw = { ...DEFAULT_CHECK_SETTINGS, ...(value as Partial<CheckSettings>) }
  const concurrency = Number(raw.concurrency)
  return {
    scope: CHECK_SCOPES.includes(raw.scope) ? raw.scope : DEFAULT_CHECK_SETTINGS.scope,
    timeoutMs: clampTimeout(Number(raw.timeoutMs)),
    concurrency: Number.isFinite(concurrency) ? Math.min(16, Math.max(1, Math.round(concurrency))) : DEFAULT_CHECK_SETTINGS.concurrency,
    method: raw.method === 'get' ? 'get' : 'auto',
    includeFiles: raw.includeFiles !== false,
    retryFailures: raw.retryFailures !== false,
    redirectsAsIssues: raw.redirectsAsIssues === true,
    skipText: typeof raw.skipText === 'string' ? raw.skipText : '',
  }
}

export function classifyResult(result: Pick<LinkCheckResult, 'status' | 'redirected' | 'timedOut'>): LinkHealth {
  const { status } = result
  if (status == null || status === 0) return result.timedOut ? 'timeout' : 'network'
  if (BLOCKED_STATUSES.has(status)) return 'blocked'
  if (status >= 500) return 'server'
  if (status >= 400) return 'broken'
  if (result.redirected || status >= 300) return 'redirect'
  return 'ok'
}

export function isProblem(health: LinkHealth, redirectsAsIssues = false): boolean {
  if (health === 'redirect') return redirectsAsIssues
  return health === 'broken' || health === 'server' || health === 'timeout' || health === 'network'
}

export function isRetryable(health: LinkHealth): boolean {
  return health === 'timeout' || health === 'network' || health === 'server'
}

export function speedOf(durationMs: number | undefined): Speed | null {
  if (durationMs == null) return null
  if (durationMs < FAST_MS) return 'fast'
  if (durationMs < SLOW_MS) return 'moderate'
  return 'slow'
}

export function gradeOf(score: number): HealthGrade {
  if (score >= 95) return 'healthy'
  if (score >= 80) return 'fair'
  return 'poor'
}

const REASONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  206: 'Partial Content',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Content Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Content',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  508: 'Loop Detected',
  520: 'Unknown Error',
  521: 'Web Server Is Down',
  522: 'Connection Timed Out',
  523: 'Origin Is Unreachable',
  524: 'A Timeout Occurred',
  525: 'SSL Handshake Failed',
  526: 'Invalid SSL Certificate',
  999: 'Request Denied',
}

export function reasonPhrase(status: number | null | undefined): string {
  return status == null ? '' : (REASONS[status] ?? '')
}

export function stripHash(href: string): string {
  try {
    const url = new URL(href)
    url.hash = ''
    return url.href
  } catch {
    return href
  }
}

export function parseSkipList(text: string): string[] {
  const seen = new Set<string>()
  for (const part of text.split(/[\n,]+/)) {
    const pattern = part.trim().toLowerCase()
    if (pattern) seen.add(pattern)
  }
  return [...seen]
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/**
 * A bare domain matches that host and its subdomains, a pattern with `/` matches anywhere in the
 * URL, and `*` is a wildcard over the host or the whole URL.
 */
export function matchesSkip(href: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false
  let host = ''
  let withoutScheme = href.toLowerCase()
  try {
    const url = new URL(href)
    host = bareHost(url.hostname)
    withoutScheme = `${url.hostname}${url.pathname}${url.search}`.toLowerCase()
  } catch {
    // Unparseable URLs are only matched by substring patterns.
  }
  const full = href.toLowerCase()
  return patterns.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = globToRegExp(pattern)
      return regex.test(host) || regex.test(withoutScheme) || regex.test(full)
    }
    if (pattern.includes('/')) return full.includes(pattern)
    const domain = bareHost(pattern)
    return host === domain || host.endsWith(`.${domain}`)
  })
}

export interface CheckTarget {
  /** The URL that is requested: the link without its #fragment. */
  url: string
  text: string
  kind: 'internal' | 'external'
  host: string
  /** Position of the first occurrence on the page. */
  order: number
  occurrences: PageLink[]
}

export interface TargetPlan {
  targets: CheckTarget[]
  available: Record<CheckScope, number>
  skipped: number
  capped: boolean
}

export function planTargets(
  links: PageLink[],
  settings: Pick<CheckSettings, 'scope' | 'includeFiles' | 'skipText'>,
  max = MAX_TARGETS,
): TargetPlan {
  const patterns = parseSkipList(settings.skipText)
  const byUrl = new Map<string, CheckTarget>()
  const skippedUrls = new Set<string>()
  for (const link of links) {
    if (link.kind !== 'internal' && link.kind !== 'external') continue
    if (!/^https?:\/\//i.test(link.href)) continue
    const url = stripHash(link.href)
    if (skippedUrls.has(url)) continue
    if ((!settings.includeFiles && link.download) || matchesSkip(url, patterns)) {
      skippedUrls.add(url)
      continue
    }
    const existing = byUrl.get(url)
    if (existing) {
      existing.occurrences.push(link)
      if (!existing.text && link.text) existing.text = link.text
    } else {
      byUrl.set(url, { url, text: link.text, kind: link.kind, host: link.host, order: link.index, occurrences: [link] })
    }
  }
  const all = [...byUrl.values()]
  const available: Record<CheckScope, number> = {
    all: all.length,
    internal: all.filter((target) => target.kind === 'internal').length,
    external: all.filter((target) => target.kind === 'external').length,
  }
  const inScope = settings.scope === 'all' ? all : all.filter((target) => target.kind === settings.scope)
  return { targets: inScope.slice(0, max), available, skipped: skippedUrls.size, capped: inScope.length > max }
}

export type EntryState =
  | { phase: 'queued' }
  | { phase: 'checking' }
  | { phase: 'done'; result: LinkCheckResult; health: LinkHealth; retried?: boolean }

export interface CheckEntry {
  target: CheckTarget
  state: EntryState
}

export function healthOf(entry: CheckEntry): LinkHealth | null {
  return entry.state.phase === 'done' ? entry.state.health : null
}

export interface CheckSummary {
  checked: number
  counts: Record<LinkHealth, number>
  problems: number
  score: number | null
  averageMs: number | null
  slowest: { url: string; durationMs: number } | null
}

export function emptyCounts(): Record<LinkHealth, number> {
  return { broken: 0, server: 0, timeout: 0, network: 0, blocked: 0, redirect: 0, ok: 0 }
}

export function summarize(entries: CheckEntry[], redirectsAsIssues = false): CheckSummary {
  const counts = emptyCounts()
  let checked = 0
  let timedTotal = 0
  let timedCount = 0
  let slowest: CheckSummary['slowest'] = null
  for (const entry of entries) {
    if (entry.state.phase !== 'done') continue
    checked += 1
    counts[entry.state.health] += 1
    const ms = entry.state.result.durationMs
    if (ms != null && entry.state.result.status != null) {
      timedTotal += ms
      timedCount += 1
      if (!slowest || ms > slowest.durationMs) slowest = { url: entry.target.url, durationMs: ms }
    }
  }
  const problems = HEALTH_ORDER.reduce((sum, health) => sum + (isProblem(health, redirectsAsIssues) ? counts[health] : 0), 0)
  // Blocked links can't be verified either way, so they don't count toward the score.
  const verifiable = checked - counts.blocked
  return {
    checked,
    counts,
    problems,
    score: verifiable > 0 ? Math.round(((verifiable - problems) / verifiable) * 100) : null,
    averageMs: timedCount > 0 ? Math.round(timedTotal / timedCount) : null,
    slowest,
  }
}

export function matchesFilter(entry: CheckEntry, filter: HealthFilter, redirectsAsIssues = false): boolean {
  if (filter === 'all') return true
  const health = healthOf(entry)
  if (!health) return false
  if (filter === 'problems') return isProblem(health, redirectsAsIssues)
  return health === filter
}

export function matchesQuery(entry: CheckEntry, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const parts = [entry.target.url, entry.target.text, ...entry.target.occurrences.map((link) => link.text)]
  if (entry.state.phase === 'done') {
    const { result } = entry.state
    parts.push(String(result.status ?? ''), reasonPhrase(result.status), result.finalUrl ?? '', result.error ?? '')
  }
  const haystack = parts.join(' ').toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

function severityRank(entry: CheckEntry): number {
  const health = healthOf(entry)
  return health ? HEALTH_ORDER.indexOf(health) : HEALTH_ORDER.length
}

function durationOf(entry: CheckEntry): number {
  return entry.state.phase === 'done' ? (entry.state.result.durationMs ?? -1) : -2
}

export function sortEntries(entries: CheckEntry[], sort: SortKey): CheckEntry[] {
  const sorted = [...entries]
  const byOrder = (a: CheckEntry, b: CheckEntry) => a.target.order - b.target.order
  switch (sort) {
    case 'severity':
      return sorted.sort((a, b) => severityRank(a) - severityRank(b) || byOrder(a, b))
    case 'slowest':
      return sorted.sort((a, b) => durationOf(b) - durationOf(a) || byOrder(a, b))
    case 'url':
      return sorted.sort((a, b) => a.target.url.localeCompare(b.target.url))
    default:
      return sorted.sort(byOrder)
  }
}

export interface EntryGroup {
  key: string
  kind: 'status' | 'site'
  health?: LinkHealth
  label: string
  entries: CheckEntry[]
  problems: number
}

export function groupEntries(entries: CheckEntry[], group: GroupKey, redirectsAsIssues = false): EntryGroup[] {
  if (group === 'none') return []
  const groups = new Map<string, EntryGroup>()
  for (const entry of entries) {
    const health = healthOf(entry)
    const key = group === 'status' ? (health ?? 'checking') : entry.target.host || entry.target.url
    let bucket = groups.get(key)
    if (!bucket) {
      bucket = {
        key,
        kind: group,
        health: group === 'status' ? (health ?? undefined) : undefined,
        label: key,
        entries: [],
        problems: 0,
      }
      groups.set(key, bucket)
    }
    bucket.entries.push(entry)
    if (health && isProblem(health, redirectsAsIssues)) bucket.problems += 1
  }
  const list = [...groups.values()]
  if (group === 'status') {
    const rank = (item: EntryGroup) => (item.health ? HEALTH_ORDER.indexOf(item.health) : HEALTH_ORDER.length)
    return list.sort((a, b) => rank(a) - rank(b))
  }
  return list.sort((a, b) => b.problems - a.problems || b.entries.length - a.entries.length || a.label.localeCompare(b.label))
}

export interface PageLinkMark {
  url: string
  tone: 'problem' | 'warning'
  label: string
}

export function marksFor(entries: CheckEntry[], redirectsAsIssues = false): PageLinkMark[] {
  const marks: PageLinkMark[] = []
  for (const entry of entries) {
    if (entry.state.phase !== 'done') continue
    const { health, result } = entry.state
    const problem = isProblem(health, redirectsAsIssues)
    if (!problem && health !== 'blocked' && health !== 'redirect') continue
    marks.push({
      url: entry.target.url,
      tone: problem ? 'problem' : 'warning',
      label: result.status != null ? String(result.status) : health === 'timeout' ? 'timeout' : 'error',
    })
  }
  return marks
}

function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function doneEntries(entries: CheckEntry[]) {
  return entries.flatMap((entry) => (entry.state.phase === 'done' ? [{ entry, ...entry.state }] : []))
}

export function entriesToCsv(entries: CheckEntry[]): string {
  const header = ['url', 'result', 'status', 'reason', 'final_url', 'response_ms', 'method', 'text', 'type', 'occurrences', 'error']
  const rows = doneEntries(entries).map(({ entry, result, health }) =>
    [
      entry.target.url,
      health,
      result.status,
      reasonPhrase(result.status),
      result.redirected ? result.finalUrl : '',
      result.durationMs,
      result.method,
      entry.target.text,
      entry.target.kind,
      entry.target.occurrences.length,
      result.error,
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export interface ReportMeta {
  pageUrl: string
  pageTitle: string
  checkedAt: Date
  redirectsAsIssues?: boolean
}

export function entriesToJson(entries: CheckEntry[], meta: ReportMeta): string {
  const summary = summarize(entries, meta.redirectsAsIssues)
  return JSON.stringify(
    {
      page: { url: meta.pageUrl, title: meta.pageTitle },
      checkedAt: meta.checkedAt.toISOString(),
      summary: { checked: summary.checked, problems: summary.problems, score: summary.score, averageMs: summary.averageMs, ...summary.counts },
      links: doneEntries(entries).map(({ entry, result, health }) => ({
        url: entry.target.url,
        result: health,
        status: result.status,
        reason: reasonPhrase(result.status) || undefined,
        finalUrl: result.redirected ? result.finalUrl : undefined,
        responseMs: result.durationMs,
        method: result.method,
        text: entry.target.text,
        type: entry.target.kind,
        occurrences: entry.target.occurrences.length,
        error: result.error,
      })),
    },
    null,
    2,
  )
}

function mdCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
}

export function entriesToMarkdown(entries: CheckEntry[], meta: ReportMeta, label: (health: LinkHealth) => string): string {
  const summary = summarize(entries, meta.redirectsAsIssues)
  const lines = [
    `# Link check: ${mdCell(meta.pageTitle || meta.pageUrl)}`,
    '',
    `${meta.pageUrl} · ${meta.checkedAt.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
    '',
    `**Health ${summary.score ?? '—'}%** · ${summary.checked} checked · ${summary.problems} problems`,
    '',
    '| Result | Links |',
    '| --- | ---: |',
    ...HEALTH_ORDER.filter((health) => summary.counts[health] > 0).map((health) => `| ${label(health)} | ${summary.counts[health]} |`),
  ]
  const flagged = sortEntries(entries, 'severity').filter((entry) => {
    const health = healthOf(entry)
    return health != null && health !== 'ok'
  })
  if (flagged.length > 0) {
    lines.push('', '## Needs attention', '', '| Status | Link text | URL | Found |', '| --- | --- | --- | ---: |')
    for (const { entry, result, health } of doneEntries(flagged)) {
      const status = result.status != null ? `${result.status} ${reasonPhrase(result.status)}`.trim() : label(health)
      const target = result.redirected && result.finalUrl ? `${entry.target.url} → ${result.finalUrl}` : entry.target.url
      lines.push(`| ${mdCell(status)} | ${mdCell(entry.target.text || '—')} | ${mdCell(target)} | ${entry.target.occurrences.length} |`)
    }
  }
  return lines.join('\n')
}
