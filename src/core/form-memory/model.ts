export const FORM_MEMORY_KEY = 'tbx.formMemory'
export const FORM_AUTOFILL_ROUTE = '/tools/productivity/form-autofill'

/** `file` values are ids of files kept under their own storage keys (see `files.ts`). */
export type MemoryFieldKind = 'text' | 'textarea' | 'select' | 'multi' | 'checkbox' | 'radio' | 'file'

export type MemoryValue = string | boolean | string[]

/** One remembered control. `key` identifies it on its page; `name`/`auto`/`label` help other sites reuse it. */
export interface MemoryField {
  key: string
  label: string
  kind: MemoryFieldKind
  value: MemoryValue
  /** Visible option text for selects and radios, so the saved list reads like the form did. */
  display?: string
  inputType?: string
  name?: string
  auto?: string
  updatedAt: number
}

export interface MemoryPage {
  /** `origin + path`, so query strings and hashes share one memory. */
  id: string
  url: string
  host: string
  path: string
  title: string
  fields: Record<string, MemoryField>
  /** Fill this page by itself whenever it opens. */
  autoFill: boolean
  createdAt: number
  updatedAt: number
  fillCount: number
  lastFilledAt?: number
}

export interface FormMemorySettings {
  /** Remember what is typed, ticked and picked in forms. */
  learn: boolean
  /** Fill remembered pages as soon as they open. */
  autoFill: boolean
  /** Hosts that are never remembered or filled. */
  blockedHosts: string[]
}

/** One distinct value the user entered into a field, waiting for review. */
export interface ReviewCandidate {
  value: MemoryValue
  display?: string
  seenAt: number
  /** How many separate times this value was entered. */
  count: number
}

/** A field on one page whose newly entered values have not been approved yet. */
export interface ReviewEntry {
  id: string
  pageId: string
  url: string
  host: string
  path: string
  title: string
  field: Omit<MemoryField, 'value' | 'display' | 'updatedAt'>
  /** Newest first. */
  values: ReviewCandidate[]
  updatedAt: number
}

export interface FormMemoryState {
  pages: Record<string, MemoryPage>
  /** Approved values that fill a matching field on any site, keyed by `globalKeyFor`. */
  global: Record<string, MemoryField>
  /** Captured values waiting for approval, keyed by `reviewIdFor`. */
  review: Record<string, ReviewEntry>
  settings: FormMemorySettings
}

/** A file picked in a form, read in the page; `data` is base64. */
export interface CapturedFile {
  name: string
  type: string
  size: number
  data: string
}

export interface CapturedField {
  key: string
  label: string
  kind: MemoryFieldKind
  value: MemoryValue
  display?: string
  inputType?: string
  name?: string
  auto?: string
  /** File contents for `file` fields, swapped for stored ids before the capture is kept. */
  files?: CapturedFile[]
}

export interface FormCapture {
  url: string
  title?: string
  fields: CapturedField[]
  /** Replace the whole page memory (an explicit "save this page") instead of merging edits. */
  replace?: boolean
}

/** Outcome of a fill, clear, save or inspect on a tab, as reported to the panel. */
export interface FormActionResult {
  ok: boolean
  /** `unavailable`: the background did not answer, so the page state is unknown. */
  reason?: 'no-tab' | 'restricted' | 'no-access' | 'blocked' | 'unavailable'
  filled: number
  cleared: number
  /** Fillable controls on the page. */
  total: number
  /** Text controls that hold a value right now. */
  populated: number
  /** Saved fields that have a control on this page. */
  matched: number
  /** Values remembered for this exact page. */
  saved: number
  /** Values from other pages and global values this one could borrow. */
  shared: number
  /** Fields on this page with values waiting for review. */
  review: number
  /** Origins of embedded frames on this page that the extension may not read yet. */
  frameAccess?: string[]
  learn: boolean
  url?: string
}

export const DEFAULT_FORM_MEMORY_SETTINGS: FormMemorySettings = {
  learn: true,
  autoFill: false,
  blockedHosts: [],
}

export const DEFAULT_FORM_MEMORY_STATE: FormMemoryState = {
  pages: {},
  global: {},
  review: {},
  settings: DEFAULT_FORM_MEMORY_SETTINGS,
}

const MAX_PAGES = 400
const MAX_GLOBAL_FIELDS = 200
export const MAX_REVIEW_ENTRIES = 300
export const MAX_REVIEW_CANDIDATES = 8
const MAX_FIELDS_PER_PAGE = 200
const MAX_VALUE_LENGTH = 4000
const KINDS = new Set<MemoryFieldKind>(['text', 'textarea', 'select', 'multi', 'checkbox', 'radio', 'file'])

export function isMemoryFieldKind(value: unknown): value is MemoryFieldKind {
  return typeof value === 'string' && KINDS.has(value as MemoryFieldKind)
}

export interface PageRef {
  id: string
  url: string
  host: string
  path: string
}

export function pageRefFor(rawUrl: string | undefined): PageRef | null {
  if (!rawUrl) return null
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (!/^(https?|file):$/.test(url.protocol)) return null
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const local = url.protocol === 'file:'
  const origin = local ? 'file://' : url.origin
  return { id: `${origin}${path}`, url: `${origin}${url.pathname}`, host: local ? 'file' : url.host, path }
}

export function isHostBlocked(settings: FormMemorySettings, host: string): boolean {
  return settings.blockedHosts.includes(host)
}

/** An empty text, an unticked box or an empty multi-select carries nothing worth refilling. */
export function isEmptyValue(field: Pick<MemoryField, 'kind' | 'value'>): boolean {
  if (field.kind === 'checkbox') return false
  if (Array.isArray(field.value)) return field.value.length === 0
  return typeof field.value === 'string' ? field.value.trim() === '' : false
}

export function cleanValue(kind: MemoryFieldKind, value: unknown): MemoryValue | null {
  if (kind === 'checkbox') return typeof value === 'boolean' ? value : null
  if (kind === 'multi' || kind === 'file') {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 50) : null
  }
  return typeof value === 'string' ? value.slice(0, MAX_VALUE_LENGTH) : null
}

export function cleanText(value: unknown, max = 120): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

export function normalizeField(raw: unknown, fallbackTime: number): MemoryField | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  if (typeof item.key !== 'string' || !item.key || !isMemoryFieldKind(item.kind)) return null
  const value = cleanValue(item.kind, item.value)
  if (value === null) return null
  return {
    key: item.key.slice(0, 300),
    label: cleanText(item.label) ?? item.key,
    kind: item.kind,
    value,
    display: cleanText(item.display, 300),
    inputType: cleanText(item.inputType, 30),
    name: cleanText(item.name, 200),
    auto: cleanText(item.auto, 60),
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : fallbackTime,
  }
}

function normalizePage(raw: unknown): MemoryPage | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const ref = pageRefFor(typeof item.url === 'string' ? item.url : undefined)
  if (!ref) return null
  const updatedAt = typeof item.updatedAt === 'number' ? item.updatedAt : 0
  const fields: Record<string, MemoryField> = {}
  if (item.fields && typeof item.fields === 'object') {
    for (const value of Object.values(item.fields as Record<string, unknown>)) {
      const field = normalizeField(value, updatedAt)
      if (field) fields[field.key] = field
    }
  }
  return {
    ...ref,
    title: cleanText(item.title, 200) ?? ref.host,
    fields,
    autoFill: item.autoFill === true,
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : updatedAt,
    updatedAt,
    fillCount: typeof item.fillCount === 'number' ? item.fillCount : 0,
    lastFilledAt: typeof item.lastFilledAt === 'number' ? item.lastFilledAt : undefined,
  }
}

export function reviewIdFor(pageId: string, key: string): string {
  return `${pageId}#${key}`
}

/** Fields sharing kind, autocomplete hint, name and label ask the same question on any site. */
export function globalKeyFor(field: Pick<MemoryField, 'kind' | 'auto' | 'name' | 'label'>): string {
  const auto = field.auto && !/^(on|off)$/i.test(field.auto) ? field.auto.toLowerCase() : ''
  const label = field.label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  return `${field.kind}|${auto}|${field.name?.toLowerCase() ?? ''}|${label}`
}

export function fieldShape(field: MemoryField): ReviewEntry['field'] {
  return {
    key: field.key,
    label: field.label,
    kind: field.kind,
    inputType: field.inputType,
    name: field.name,
    auto: field.auto,
  }
}

const PLACEHOLDER_VALUE: Record<MemoryFieldKind, MemoryValue> = {
  text: '',
  textarea: '',
  select: '',
  radio: '',
  multi: [],
  file: [],
  checkbox: false,
}

function normalizeGlobal(raw: unknown): Record<string, MemoryField> {
  const global: Record<string, MemoryField> = {}
  if (!raw || typeof raw !== 'object') return global
  for (const value of Object.values(raw as Record<string, unknown>)) {
    const field = normalizeField(value, 0)
    if (field && !isEmptyValue(field)) global[globalKeyFor(field)] = field
  }
  return global
}

function normalizeCandidate(kind: MemoryFieldKind, raw: unknown): ReviewCandidate | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const value = cleanValue(kind, item.value)
  if (value === null || isEmptyValue({ kind, value })) return null
  return {
    value,
    display: cleanText(item.display, 300),
    seenAt: typeof item.seenAt === 'number' ? item.seenAt : 0,
    count: typeof item.count === 'number' && item.count >= 1 ? Math.floor(item.count) : 1,
  }
}

function normalizeReviewEntry(raw: unknown): ReviewEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const ref = pageRefFor(typeof item.url === 'string' ? item.url : undefined)
  const shape = item.field && typeof item.field === 'object' ? (item.field as Record<string, unknown>) : null
  if (!ref || !shape || !isMemoryFieldKind(shape.kind)) return null
  const field = normalizeField({ ...shape, value: PLACEHOLDER_VALUE[shape.kind] }, 0)
  if (!field) return null
  const values = (Array.isArray(item.values) ? item.values : [])
    .map((value) => normalizeCandidate(field.kind, value))
    .filter((value): value is ReviewCandidate => value !== null)
    .slice(0, MAX_REVIEW_CANDIDATES)
  if (values.length === 0) return null
  return {
    id: reviewIdFor(ref.id, field.key),
    pageId: ref.id,
    url: ref.url,
    host: ref.host,
    path: ref.path,
    title: cleanText(item.title, 200) ?? ref.host,
    field: fieldShape(field),
    values,
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0,
  }
}

function normalizeReview(raw: unknown): Record<string, ReviewEntry> {
  const review: Record<string, ReviewEntry> = {}
  if (!raw || typeof raw !== 'object') return review
  for (const value of Object.values(raw as Record<string, unknown>)) {
    const entry = normalizeReviewEntry(value)
    if (entry) review[entry.id] = entry
  }
  return review
}

export function normalizeFormMemoryState(raw: unknown): FormMemoryState {
  if (!raw || typeof raw !== 'object') return DEFAULT_FORM_MEMORY_STATE
  const item = raw as Record<string, unknown>
  const pages: Record<string, MemoryPage> = {}
  if (item.pages && typeof item.pages === 'object') {
    for (const value of Object.values(item.pages as Record<string, unknown>)) {
      const page = normalizePage(value)
      if (page && Object.keys(page.fields).length > 0) pages[page.id] = page
    }
  }
  const settings = (item.settings ?? {}) as Partial<FormMemorySettings>
  return {
    pages,
    global: normalizeGlobal(item.global),
    review: normalizeReview(item.review),
    settings: {
      learn: settings.learn !== false,
      autoFill: settings.autoFill === true,
      blockedHosts: Array.isArray(settings.blockedHosts)
        ? settings.blockedHosts.filter((host): host is string => typeof host === 'string')
        : [],
    },
  }
}

function trimPages(pages: Record<string, MemoryPage>): Record<string, MemoryPage> {
  const list = Object.values(pages)
  if (list.length <= MAX_PAGES) return pages
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  return Object.fromEntries(list.slice(0, MAX_PAGES).map((page) => [page.id, page]))
}

/**
 * Merges what the user just entered into the page's memory. Clearing a field forgets it, so a
 * remembered page always mirrors the last thing typed there.
 */
export function applyCapture(state: FormMemoryState, capture: FormCapture, now: number): FormMemoryState {
  const ref = pageRefFor(capture.url)
  if (!ref || isHostBlocked(state.settings, ref.host)) return state
  const existing = state.pages[ref.id]
  const fields: Record<string, MemoryField> = capture.replace ? {} : { ...(existing?.fields ?? {}) }
  let changed = Boolean(capture.replace && existing)
  for (const raw of capture.fields) {
    const field = normalizeField({ ...raw, updatedAt: now }, now)
    if (!field) continue
    if (isEmptyValue(field)) {
      if (fields[field.key]) {
        delete fields[field.key]
        changed = true
      }
      continue
    }
    const previous = fields[field.key]
    if (previous && sameValue(previous.value, field.value) && previous.label === field.label) continue
    fields[field.key] = field
    changed = true
  }
  if (!changed) return state
  const pages = { ...state.pages }
  if (Object.keys(fields).length === 0) {
    delete pages[ref.id]
    return { ...state, pages }
  }
  const keys = Object.keys(fields)
  const bounded =
    keys.length > MAX_FIELDS_PER_PAGE
      ? Object.fromEntries(
          Object.values(fields)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_FIELDS_PER_PAGE)
            .map((field) => [field.key, field]),
        )
      : fields
  pages[ref.id] = {
    ...ref,
    title: cleanText(capture.title, 200) ?? existing?.title ?? ref.host,
    fields: bounded,
    autoFill: existing?.autoFill ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    fillCount: existing?.fillCount ?? 0,
    lastFilledAt: existing?.lastFilledAt,
  }
  return { ...state, pages: trimPages(pages) }
}

export function sameValue(a: MemoryValue, b: MemoryValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i])
  return a === b
}

export function removeMemoryField(state: FormMemoryState, pageId: string, key: string): FormMemoryState {
  const page = state.pages[pageId]
  if (!page?.fields[key]) return state
  const fields = { ...page.fields }
  delete fields[key]
  const pages = { ...state.pages }
  if (Object.keys(fields).length === 0) delete pages[pageId]
  else pages[pageId] = { ...page, fields, updatedAt: Date.now() }
  return { ...state, pages }
}

export function updateMemoryField(
  state: FormMemoryState,
  pageId: string,
  key: string,
  value: MemoryValue,
  now: number,
): FormMemoryState {
  const page = state.pages[pageId]
  const field = page?.fields[key]
  if (!page || !field) return state
  const next = cleanValue(field.kind, value)
  if (next === null) return state
  if (isEmptyValue({ kind: field.kind, value: next })) return removeMemoryField(state, pageId, key)
  return {
    ...state,
    pages: {
      ...state.pages,
      [pageId]: {
        ...page,
        updatedAt: now,
        fields: { ...page.fields, [key]: { ...field, value: next, display: undefined, updatedAt: now } },
      },
    },
  }
}

export function removeMemoryPage(state: FormMemoryState, pageId: string): FormMemoryState {
  if (!state.pages[pageId]) return state
  const pages = { ...state.pages }
  delete pages[pageId]
  return { ...state, pages }
}

export function removeMemoryHost(state: FormMemoryState, host: string): FormMemoryState {
  const pages = Object.fromEntries(Object.entries(state.pages).filter(([, page]) => page.host !== host))
  return { ...state, pages }
}

export function restoreMemoryPages(state: FormMemoryState, restored: MemoryPage[]): FormMemoryState {
  const pages = { ...state.pages }
  for (const page of restored) pages[page.id] = page
  return { ...state, pages: trimPages(pages) }
}

export function setPageAutoFill(state: FormMemoryState, pageId: string, autoFill: boolean): FormMemoryState {
  const page = state.pages[pageId]
  if (!page || page.autoFill === autoFill) return state
  return { ...state, pages: { ...state.pages, [pageId]: { ...page, autoFill } } }
}

export function setHostBlocked(state: FormMemoryState, host: string, blocked: boolean): FormMemoryState {
  const rest = state.settings.blockedHosts.filter((item) => item !== host)
  return {
    ...state,
    settings: { ...state.settings, blockedHosts: blocked ? [...rest, host] : rest },
  }
}

export function markPageFilled(state: FormMemoryState, pageId: string, now: number): FormMemoryState {
  const page = state.pages[pageId]
  if (!page) return state
  return {
    ...state,
    pages: { ...state.pages, [pageId]: { ...page, fillCount: page.fillCount + 1, lastFilledAt: now } },
  }
}

export function setGlobalField(state: FormMemoryState, field: MemoryField): FormMemoryState {
  if (isEmptyValue(field)) return state
  const global = { ...state.global, [globalKeyFor(field)]: field }
  const list = Object.values(global)
  if (list.length <= MAX_GLOBAL_FIELDS) return { ...state, global }
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  return {
    ...state,
    global: Object.fromEntries(list.slice(0, MAX_GLOBAL_FIELDS).map((item) => [globalKeyFor(item), item])),
  }
}

export function removeGlobalField(state: FormMemoryState, key: string): FormMemoryState {
  if (!state.global[key]) return state
  const global = { ...state.global }
  delete global[key]
  return { ...state, global }
}

export function updateGlobalField(state: FormMemoryState, key: string, value: MemoryValue, now: number): FormMemoryState {
  const field = state.global[key]
  if (!field) return state
  const next = cleanValue(field.kind, value)
  if (next === null) return state
  if (isEmptyValue({ kind: field.kind, value: next })) return removeGlobalField(state, key)
  return { ...state, global: { ...state.global, [key]: { ...field, value: next, display: undefined, updatedAt: now } } }
}

export function restoreGlobalFields(state: FormMemoryState, fields: MemoryField[]): FormMemoryState {
  return fields.reduce(setGlobalField, state)
}

export interface FillPlan {
  pageId: string | null
  /** Values remembered for exactly this page. */
  page: MemoryField[]
  /** Values approved for every site, newest first; any matching field on this page takes them. */
  global: MemoryField[]
  /** Values from other pages a matching field on this page can borrow (newest first, text only). */
  shared: MemoryField[]
}

const SHARED_KINDS = new Set<MemoryFieldKind>(['text', 'textarea'])
const SHARED_LIMIT = 150

function sharedIdentity(field: MemoryField): string | null {
  if (!SHARED_KINDS.has(field.kind)) return null
  const auto = field.auto && !/^(on|off)$/i.test(field.auto) ? field.auto.toLowerCase() : ''
  const name = field.name?.toLowerCase() ?? ''
  const label = field.label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  return auto || name || label ? `${auto}|${name}|${label}` : null
}

export function planFill(state: FormMemoryState, url: string | undefined, includeShared: boolean): FillPlan {
  const ref = pageRefFor(url)
  if (!ref || isHostBlocked(state.settings, ref.host)) return { pageId: null, page: [], global: [], shared: [] }
  const page = state.pages[ref.id]
  const own = page ? Object.values(page.fields) : []
  const global = Object.values(state.global).sort((a, b) => b.updatedAt - a.updatedAt)
  if (!includeShared) return { pageId: page ? ref.id : null, page: own, global, shared: [] }
  const seen = new Set<string>()
  const shared: MemoryField[] = []
  const others = Object.values(state.pages)
    .filter((item) => item.id !== ref.id && !isHostBlocked(state.settings, item.host))
    .flatMap((item) => Object.values(item.fields))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  for (const field of others) {
    const identity = sharedIdentity(field)
    if (!identity || seen.has(identity)) continue
    seen.add(identity)
    shared.push(field)
    if (shared.length >= SHARED_LIMIT) break
  }
  return { pageId: page ? ref.id : null, page: own, global, shared }
}

export interface MemoryHostGroup {
  host: string
  pages: MemoryPage[]
  fieldCount: number
  updatedAt: number
  blocked: boolean
}

export function groupMemoryByHost(state: FormMemoryState): MemoryHostGroup[] {
  const groups = new Map<string, MemoryHostGroup>()
  for (const page of Object.values(state.pages)) {
    const group = groups.get(page.host) ?? {
      host: page.host,
      pages: [],
      fieldCount: 0,
      updatedAt: 0,
      blocked: isHostBlocked(state.settings, page.host),
    }
    group.pages.push(page)
    group.fieldCount += Object.keys(page.fields).length
    group.updatedAt = Math.max(group.updatedAt, page.updatedAt)
    groups.set(page.host, group)
  }
  for (const group of groups.values()) group.pages.sort((a, b) => b.updatedAt - a.updatedAt)
  return [...groups.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function memoryTotals(state: FormMemoryState): { sites: number; pages: number; fields: number } {
  const pages = Object.values(state.pages)
  return {
    sites: new Set(pages.map((page) => page.host)).size,
    pages: pages.length,
    fields: pages.reduce((sum, page) => sum + Object.keys(page.fields).length, 0),
  }
}
