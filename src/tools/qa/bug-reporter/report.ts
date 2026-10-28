export const SEVERITIES = ['blocker', 'critical', 'major', 'minor', 'trivial'] as const
export type Severity = (typeof SEVERITIES)[number]

export const PRIORITIES = ['p1', 'p2', 'p3', 'p4'] as const
export type Priority = (typeof PRIORITIES)[number]

export const BUG_TYPES = [
  'functional',
  'ui',
  'performance',
  'crash',
  'content',
  'accessibility',
  'security',
] as const
export type BugType = (typeof BUG_TYPES)[number]

export const REPRODUCIBILITY = ['always', 'often', 'rarely', 'once'] as const
export type Reproducibility = (typeof REPRODUCIBILITY)[number]

export const ENV_FIELDS = [
  'page',
  'url',
  'reported',
  'browser',
  'os',
  'viewport',
  'screen',
  'pixelRatio',
  'language',
  'timezone',
  'userAgent',
] as const
export type EnvField = (typeof ENV_FIELDS)[number]

export const REPORT_FORMATS = ['markdown', 'jira', 'text', 'json'] as const
export type ReportFormat = (typeof REPORT_FORMATS)[number]

export const READINESS_CHECKS = ['title', 'actual', 'expected', 'steps', 'evidence'] as const
export type ReadinessCheck = (typeof READINESS_CHECKS)[number]

/** Fields that block generating a report when empty. */
export type RequiredField = 'title' | 'actual'

export const SUGGESTED_LABELS = ['regression', 'mobile', 'desktop', 'flaky', 'a11y', 'ux'] as const

export const TITLE_MAX = 120
export const MAX_LABELS = 12
export const LABEL_MAX = 32
export const MAX_HISTORY = 50

export interface BugStep {
  id: string
  text: string
}

export interface BugDraft {
  id: string
  title: string
  severity: Severity
  priority: Priority
  type: BugType
  reproducibility: Reproducibility
  expected: string
  actual: string
  steps: BugStep[]
  notes: string
  labels: string[]
  include: Record<EnvField, boolean>
  reportedAt: string
}

export interface PageContext {
  title: string
  url: string
  favIconUrl?: string
}

export interface BugEnvironment {
  browser: string
  os: string
  viewport: string
  screen: string
  pixelRatio: string
  language: string
  timezone: string
  userAgent: string
}

export interface ReportInput {
  draft: BugDraft
  page: PageContext | null
  env: BugEnvironment | null
  screenshotName?: string | null
}

export interface ReportOptions {
  skipEmpty: boolean
}

export interface ReportPrefs extends ReportOptions {
  format: ReportFormat
}

export const DEFAULT_PREFS: ReportPrefs = { format: 'markdown', skipEmpty: true }

interface TemplatePreset {
  severity: Severity
  priority: Priority
  reproducibility: Reproducibility
  labels: string[]
}

/** One starting point per bug type; applying it never touches anything the user typed. */
export const TEMPLATES: Record<BugType, TemplatePreset> = {
  functional: { severity: 'major', priority: 'p2', reproducibility: 'always', labels: [] },
  ui: { severity: 'minor', priority: 'p3', reproducibility: 'always', labels: ['ux'] },
  performance: { severity: 'major', priority: 'p3', reproducibility: 'often', labels: ['performance'] },
  crash: { severity: 'critical', priority: 'p1', reproducibility: 'always', labels: [] },
  content: { severity: 'trivial', priority: 'p4', reproducibility: 'always', labels: ['copy'] },
  accessibility: { severity: 'major', priority: 'p2', reproducibility: 'always', labels: ['a11y'] },
  security: { severity: 'blocker', priority: 'p1', reproducibility: 'always', labels: ['security'] },
}

export function applyTemplate(draft: BugDraft, type: BugType): Partial<BugDraft> {
  const { labels, ...rest } = TEMPLATES[type]
  return { ...rest, type, labels: addLabels(draft.labels, labels.join(',')) }
}

export interface SavedReport {
  id: string
  savedAt: number
  draft: BugDraft
  page: PageContext | null
  env: BugEnvironment | null
  screenshotName: string | null
}

const SEVERITY_TEXT: Record<Severity, string> = {
  blocker: 'Blocker',
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  trivial: 'Trivial',
}

const PRIORITY_TEXT: Record<Priority, string> = {
  p1: 'P1 – Urgent',
  p2: 'P2 – High',
  p3: 'P3 – Medium',
  p4: 'P4 – Low',
}

const TYPE_TEXT: Record<BugType, string> = {
  functional: 'Functional',
  ui: 'UI / Layout',
  performance: 'Performance',
  crash: 'Crash / Error',
  content: 'Content',
  accessibility: 'Accessibility',
  security: 'Security',
}

const REPRO_TEXT: Record<Reproducibility, string> = {
  always: 'Always',
  often: 'Often',
  rarely: 'Rarely',
  once: 'Happened once',
}

const ENV_TEXT: Record<EnvField, string> = {
  page: 'Page',
  url: 'URL',
  reported: 'Reported',
  browser: 'Browser',
  os: 'OS',
  viewport: 'Viewport',
  screen: 'Screen',
  pixelRatio: 'Pixel ratio',
  language: 'Language',
  timezone: 'Time zone',
  userAgent: 'User agent',
}

const EMPTY = '—'

const pad = (value: number) => String(value).padStart(2, '0')

/** Local time with its UTC offset, e.g. `2026-10-28 19:08:07 UTC+05:30`. */
export function formatTimestamp(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ` +
    `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

export function createStep(text = ''): BugStep {
  return { id: crypto.randomUUID(), text }
}

export function defaultInclude(): Record<EnvField, boolean> {
  return Object.fromEntries(ENV_FIELDS.map((field) => [field, true])) as Record<EnvField, boolean>
}

export function createDraft(now = new Date()): BugDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    severity: 'major',
    priority: 'p3',
    type: 'functional',
    reproducibility: 'always',
    expected: '',
    actual: '',
    steps: [createStep()],
    notes: '',
    labels: [],
    include: defaultInclude(),
    reportedAt: formatTimestamp(now),
  }
}

export function filledSteps(steps: readonly BugStep[]): string[] {
  return steps.map((step) => step.text.trim()).filter(Boolean)
}

/** True while nothing the user typed would be lost by starting over. */
export function isDraftEmpty(draft: BugDraft): boolean {
  return (
    !draft.title.trim() &&
    !draft.expected.trim() &&
    !draft.actual.trim() &&
    !draft.notes.trim() &&
    draft.labels.length === 0 &&
    filledSteps(draft.steps).length === 0
  )
}

const STEP_PREFIX = /^\s*(?:(?:step\s*)?\d+\s*[.):-]|[-*•])\s*/i

/** Splits pasted text into one step per line, dropping numbering and bullets. */
export function splitSteps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(STEP_PREFIX, '').trim())
    .filter(Boolean)
}

export function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, '-').replace(/^#/, '').toLowerCase().slice(0, LABEL_MAX)
}

export function addLabels(current: readonly string[], raw: string): string[] {
  const next = [...current]
  for (const part of raw.split(',')) {
    const label = normalizeLabel(part)
    if (label && !next.includes(label) && next.length < MAX_LABELS) next.push(label)
  }
  return next
}

export function validateDraft(draft: BugDraft): RequiredField[] {
  const missing: RequiredField[] = []
  if (!draft.title.trim()) missing.push('title')
  if (!draft.actual.trim()) missing.push('actual')
  return missing
}

export function readiness(draft: BugDraft, hasScreenshot: boolean): Record<ReadinessCheck, boolean> {
  return {
    title: !!draft.title.trim(),
    actual: !!draft.actual.trim(),
    expected: !!draft.expected.trim(),
    steps: filledSteps(draft.steps).length > 0,
    evidence: hasScreenshot || !!draft.notes.trim(),
  }
}

export function reportTitle(draft: BugDraft): string {
  const title = draft.title.trim()
  if (title) return title
  const firstLine = draft.actual.trim().split(/\r?\n/)[0] ?? ''
  if (firstLine) return firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine
  return 'Untitled bug'
}

export function hostOf(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).host || url
  } catch {
    return url
  }
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/, '') || 'report'
  )
}

export function screenshotFileName(title: string, date: Date): string {
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `bug-${slug(title)}-${stamp}.png`
}

const FORMAT_FILE: Record<ReportFormat, { ext: string; mime: string }> = {
  markdown: { ext: 'md', mime: 'text/markdown' },
  jira: { ext: 'txt', mime: 'text/plain' },
  text: { ext: 'txt', mime: 'text/plain' },
  json: { ext: 'json', mime: 'application/json' },
}

export function reportFile(title: string, format: ReportFormat): { name: string; mime: string } {
  const { ext, mime } = FORMAT_FILE[format]
  return { name: `bug-${slug(title)}.${ext}`, mime }
}

export function environmentValues(input: ReportInput): Record<EnvField, string> {
  const { draft, page, env } = input
  return {
    page: page?.title ?? '',
    url: page?.url ?? '',
    reported: draft.reportedAt,
    browser: env?.browser ?? '',
    os: env?.os ?? '',
    viewport: env?.viewport ?? '',
    screen: env?.screen ?? '',
    pixelRatio: env?.pixelRatio ?? '',
    language: env?.language ?? '',
    timezone: env?.timezone ?? '',
    userAgent: env?.userAgent ?? '',
  }
}

function environmentPairs(input: ReportInput): [string, string][] {
  const values = environmentValues(input)
  return ENV_FIELDS.filter((field) => input.draft.include[field] && values[field]).map((field) => [
    ENV_TEXT[field],
    values[field],
  ])
}

type Section =
  | { heading: string; kind: 'text'; text: string }
  | { heading: string; kind: 'ordered'; items: string[] }
  | { heading: string; kind: 'pairs'; pairs: [string, string][] }

function isEmptySection(section: Section): boolean {
  if (section.kind === 'text') return !section.text
  if (section.kind === 'ordered') return section.items.length === 0
  return section.pairs.length === 0
}

function buildSections(input: ReportInput, options: ReportOptions): Section[] {
  const { draft } = input
  const sections: Section[] = [
    { heading: 'Expected result', kind: 'text', text: draft.expected.trim() },
    { heading: 'Actual result', kind: 'text', text: draft.actual.trim() },
    { heading: 'Steps to reproduce', kind: 'ordered', items: filledSteps(draft.steps) },
    { heading: 'Environment', kind: 'pairs', pairs: environmentPairs(input) },
  ]
  if (input.screenshotName) {
    sections.push({
      heading: 'Screenshot',
      kind: 'text',
      text: `Attached: ${input.screenshotName}`,
    })
  }
  sections.push({ heading: 'Notes', kind: 'text', text: draft.notes.trim() })
  return options.skipEmpty ? sections.filter((section) => !isEmptySection(section)) : sections
}

function summaryPairs(draft: BugDraft): [string, string][] {
  const pairs: [string, string][] = [
    ['Severity', SEVERITY_TEXT[draft.severity]],
    ['Priority', PRIORITY_TEXT[draft.priority]],
    ['Type', TYPE_TEXT[draft.type]],
    ['Reproducible', REPRO_TEXT[draft.reproducibility]],
  ]
  if (draft.labels.length > 0) pairs.push(['Labels', draft.labels.join(', ')])
  return pairs
}

const tableCell = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

function toMarkdown(input: ReportInput, options: ReportOptions): string {
  const { draft } = input
  const lines = [`## ${reportTitle(draft)}`, '', '| Field | Value |', '| --- | --- |']
  for (const [label, value] of summaryPairs(draft)) {
    lines.push(`| **${label}** | ${tableCell(label === 'Labels' ? draft.labels.map((l) => `\`${l}\``).join(' ') : value)} |`)
  }
  for (const section of buildSections(input, options)) {
    lines.push('', `### ${section.heading}`)
    if (section.kind === 'text') lines.push(section.text || EMPTY)
    else if (section.kind === 'ordered') {
      if (section.items.length === 0) lines.push(EMPTY)
      else section.items.forEach((item, index) => lines.push(`${index + 1}. ${item}`))
    } else if (section.pairs.length === 0) lines.push(EMPTY)
    else section.pairs.forEach(([label, value]) => lines.push(`- **${label}:** ${value}`))
  }
  return lines.join('\n')
}

function toJira(input: ReportInput, options: ReportOptions): string {
  const { draft } = input
  const lines = [`h2. ${reportTitle(draft)}`, '']
  for (const [label, value] of summaryPairs(draft)) lines.push(`||${label}|${tableCell(value)}|`)
  for (const section of buildSections(input, options)) {
    lines.push('', `h3. ${section.heading}`)
    if (section.kind === 'text') lines.push(section.text || EMPTY)
    else if (section.kind === 'ordered') {
      if (section.items.length === 0) lines.push(EMPTY)
      else section.items.forEach((item) => lines.push(`# ${item}`))
    } else if (section.pairs.length === 0) lines.push(EMPTY)
    else section.pairs.forEach(([label, value]) => lines.push(`* *${label}:* ${value}`))
  }
  return lines.join('\n')
}

function toText(input: ReportInput, options: ReportOptions): string {
  const { draft } = input
  const title = `BUG: ${reportTitle(draft)}`
  const lines = [title, '='.repeat(Math.min(title.length, 72))]
  for (const [label, value] of summaryPairs(draft)) lines.push(`${label}: ${value}`)
  for (const section of buildSections(input, options)) {
    lines.push('', section.heading.toUpperCase())
    if (section.kind === 'text') lines.push(section.text || EMPTY)
    else if (section.kind === 'ordered') {
      if (section.items.length === 0) lines.push(EMPTY)
      else section.items.forEach((item, index) => lines.push(`${index + 1}. ${item}`))
    } else if (section.pairs.length === 0) lines.push(EMPTY)
    else section.pairs.forEach(([label, value]) => lines.push(`${label}: ${value}`))
  }
  return lines.join('\n')
}

function toJson(input: ReportInput): string {
  const { draft } = input
  const values = environmentValues(input)
  const environment = Object.fromEntries(
    ENV_FIELDS.filter((field) => draft.include[field] && values[field]).map((field) => [
      field,
      values[field],
    ]),
  )
  return JSON.stringify(
    {
      title: reportTitle(draft),
      severity: draft.severity,
      priority: draft.priority.toUpperCase(),
      type: draft.type,
      reproducibility: draft.reproducibility,
      labels: draft.labels,
      expected: draft.expected.trim(),
      actual: draft.actual.trim(),
      steps: filledSteps(draft.steps),
      notes: draft.notes.trim(),
      environment,
      screenshot: input.screenshotName ?? null,
    },
    null,
    2,
  )
}

export function formatReport(
  input: ReportInput,
  format: ReportFormat,
  options: ReportOptions = { skipEmpty: true },
): string {
  switch (format) {
    case 'markdown':
      return toMarkdown(input, options)
    case 'jira':
      return toJira(input, options)
    case 'text':
      return toText(input, options)
    case 'json':
      return toJson(input)
  }
}

/** Mail clients reject very long `mailto:` links, so the body is cut to a safe length. */
export const MAILTO_BODY_MAX = 1800

export function mailtoUrl(subject: string, body: string): string {
  const trimmed = body.length > MAILTO_BODY_MAX ? `${body.slice(0, MAILTO_BODY_MAX - 1)}…` : body
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(trimmed)}`
}

/** A copy of a saved report under a new id, so filing it again never overwrites the original. */
export function duplicateDraft(draft: BugDraft, now = new Date()): BugDraft {
  return {
    ...draft,
    id: crypto.randomUUID(),
    steps: draft.steps.map((step) => createStep(step.text)),
    labels: [...draft.labels],
    include: { ...draft.include },
    reportedAt: formatTimestamp(now),
  }
}

export function upsertReport(list: readonly SavedReport[], entry: SavedReport): SavedReport[] {
  return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY)
}

export function matchesQuery(entry: SavedReport, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [entry.draft.title, entry.draft.actual, entry.page?.url ?? '', ...entry.draft.labels]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/** Rebuilds a stored draft, filling in anything missing or malformed with defaults. */
export function sanitizeDraft(value: unknown): BugDraft | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null
  const base = createDraft()
  const steps = Array.isArray(value.steps)
    ? value.steps
        .filter(isRecord)
        .map((step) => ({ id: str(step.id) || crypto.randomUUID(), text: str(step.text) }))
    : []
  const include = isRecord(value.include) ? value.include : {}
  return {
    id: value.id,
    title: str(value.title).slice(0, TITLE_MAX),
    severity: pick(value.severity, SEVERITIES, base.severity),
    priority: pick(value.priority, PRIORITIES, base.priority),
    type: pick(value.type, BUG_TYPES, base.type),
    reproducibility: pick(value.reproducibility, REPRODUCIBILITY, base.reproducibility),
    expected: str(value.expected),
    actual: str(value.actual),
    steps: steps.length > 0 ? steps : base.steps,
    notes: str(value.notes),
    labels: Array.isArray(value.labels)
      ? value.labels.filter((label): label is string => typeof label === 'string').slice(0, MAX_LABELS)
      : [],
    include: Object.fromEntries(
      ENV_FIELDS.map((field) => [field, typeof include[field] === 'boolean' ? include[field] : true]),
    ) as Record<EnvField, boolean>,
    reportedAt: str(value.reportedAt, base.reportedAt),
  }
}

export function sanitizePage(value: unknown): PageContext | null {
  if (!isRecord(value)) return null
  return {
    title: str(value.title),
    url: str(value.url),
    favIconUrl: typeof value.favIconUrl === 'string' ? value.favIconUrl : undefined,
  }
}

export function sanitizeEnvironment(value: unknown): BugEnvironment | null {
  if (!isRecord(value)) return null
  return {
    browser: str(value.browser),
    os: str(value.os),
    viewport: str(value.viewport),
    screen: str(value.screen),
    pixelRatio: str(value.pixelRatio),
    language: str(value.language),
    timezone: str(value.timezone),
    userAgent: str(value.userAgent),
  }
}

export function sanitizePrefs(value: unknown): ReportPrefs {
  if (!isRecord(value)) return { ...DEFAULT_PREFS }
  return {
    format: pick(value.format, REPORT_FORMATS, DEFAULT_PREFS.format),
    skipEmpty: typeof value.skipEmpty === 'boolean' ? value.skipEmpty : DEFAULT_PREFS.skipEmpty,
  }
}

export function sanitizeHistory(value: unknown): SavedReport[] {
  if (!Array.isArray(value)) return []
  const list: SavedReport[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const draft = sanitizeDraft(item.draft)
    if (!draft) continue
    list.push({
      id: draft.id,
      savedAt: typeof item.savedAt === 'number' ? item.savedAt : 0,
      draft,
      page: sanitizePage(item.page),
      env: sanitizeEnvironment(item.env),
      screenshotName: typeof item.screenshotName === 'string' ? item.screenshotName : null,
    })
  }
  return list.slice(0, MAX_HISTORY)
}
