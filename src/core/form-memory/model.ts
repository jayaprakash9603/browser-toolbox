export const FORM_MEMORY_KEY = 'tbx.formMemory'
export const FORM_AUTOFILL_ROUTE = '/tools/productivity/form-autofill'

export type MemoryFieldKind = 'text' | 'textarea' | 'select' | 'multi' | 'checkbox' | 'radio'

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

export interface FormMemoryState {
  pages: Record<string, MemoryPage>
  settings: FormMemorySettings
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
  reason?: 'no-tab' | 'restricted' | 'no-access' | 'blocked'
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
  /** Values from other pages this one could borrow. */
  shared: number
  learn: boolean
  url?: string
}

export const DEFAULT_FORM_MEMORY_SETTINGS: FormMemorySettings = {
  learn: true,
  autoFill: true,
  blockedHosts: [],
}

export const DEFAULT_FORM_MEMORY_STATE: FormMemoryState = {
  pages: {},
  settings: DEFAULT_FORM_MEMORY_SETTINGS,
}

const MAX_PAGES = 400
const MAX_FIELDS_PER_PAGE = 200
const MAX_VALUE_LENGTH = 4000
const KINDS = new Set<MemoryFieldKind>(['text', 'textarea', 'select', 'multi', 'checkbox', 'radio'])

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

function cleanValue(kind: MemoryFieldKind, value: unknown): MemoryValue | null {
  if (kind === 'checkbox') return typeof value === 'boolean' ? value : null
  if (kind === 'multi') {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 50) : null
  }
  return typeof value === 'string' ? value.slice(0, MAX_VALUE_LENGTH) : null
}

function cleanText(value: unknown, max = 120): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

function normalizeField(raw: unknown, fallbackTime: number): MemoryField | null {
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
    autoFill: item.autoFill !== false,
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : updatedAt,
    updatedAt,
    fillCount: typeof item.fillCount === 'number' ? item.fillCount : 0,
    lastFilledAt: typeof item.lastFilledAt === 'number' ? item.lastFilledAt : undefined,
  }
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
    settings: {
      learn: settings.learn !== false,
      autoFill: settings.autoFill !== false,
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
    autoFill: existing?.autoFill ?? true,
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

export interface FillPlan {
  pageId: string | null
  /** Values remembered for exactly this page. */
  page: MemoryField[]
  /** Values from other pages a matching field on this page can borrow (newest first, text only). */
  shared: MemoryField[]
}

const SHARED_KINDS = new Set<MemoryFieldKind>(['text', 'textarea'])
const SHARED_LIMIT = 150

function sharedIdentity(field: MemoryField): string | null {
  if (!SHARED_KINDS.has(field.kind)) return null
  const auto = field.auto && !/^(on|off)$/i.test(field.auto) ? field.auto.toLowerCase() : ''
  const name = field.name?.toLowerCase() ?? ''
  const label = field.label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return auto || name || label ? `${auto}|${name}|${label}` : null
}

export function planFill(state: FormMemoryState, url: string | undefined, includeShared: boolean): FillPlan {
  const ref = pageRefFor(url)
  if (!ref || isHostBlocked(state.settings, ref.host)) return { pageId: null, page: [], shared: [] }
  const page = state.pages[ref.id]
  const own = page ? Object.values(page.fields) : []
  if (!includeShared) return { pageId: page ? ref.id : null, page: own, shared: [] }
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
  return { pageId: page ? ref.id : null, page: own, shared }
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
