import {
  MAX_REVIEW_CANDIDATES,
  MAX_REVIEW_ENTRIES,
  applyCapture,
  cleanText,
  fieldShape,
  globalKeyFor,
  isEmptyValue,
  isHostBlocked,
  normalizeField,
  pageRefFor,
  sameValue,
  setGlobalField,
  type FormCapture,
  type FormMemoryState,
  type MemoryField,
  type ReviewCandidate,
  type ReviewEntry,
  reviewIdFor,
} from './model'

export type ReviewScope = 'page' | 'global'

/** Flushes this close together are one edit still being typed, not a second answer. */
const EDIT_WINDOW_MS = 30_000

function mergeCandidate(values: ReviewCandidate[], field: MemoryField, now: number): ReviewCandidate[] {
  const [latest, ...older] = values
  const editing = latest !== undefined && now - latest.seenAt < EDIT_WINDOW_MS
  if (editing && sameValue(latest.value, field.value)) return values
  // The newest value was this same edit in progress, so take back the count it added.
  const pool = !editing ? values : latest.count > 1 ? [{ ...latest, count: latest.count - 1 }, ...older] : older
  const previous = pool.find((item) => sameValue(item.value, field.value))
  const rest = pool.filter((item) => item !== previous)
  const next: ReviewCandidate = {
    value: field.value,
    display: field.display,
    seenAt: now,
    count: (previous?.count ?? 0) + 1,
  }
  return [next, ...rest].slice(0, MAX_REVIEW_CANDIDATES)
}

function trimReview(review: Record<string, ReviewEntry>): Record<string, ReviewEntry> {
  const list = Object.values(review)
  if (list.length <= MAX_REVIEW_ENTRIES) return review
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  return Object.fromEntries(list.slice(0, MAX_REVIEW_ENTRIES).map((entry) => [entry.id, entry]))
}

function alreadyApproved(state: FormMemoryState, pageId: string, field: MemoryField): boolean {
  const saved = state.pages[pageId]?.fields[field.key]
  if (saved && sameValue(saved.value, field.value)) return true
  const global = state.global[globalKeyFor(field)]
  return Boolean(global && sameValue(global.value, field.value))
}

/**
 * Queues what the user just entered for review instead of saving it. Values that are already
 * approved are skipped, and clearing a field leaves approved memory alone.
 */
export function applyReviewCapture(state: FormMemoryState, capture: FormCapture, now: number): FormMemoryState {
  const ref = pageRefFor(capture.url)
  if (!ref || isHostBlocked(state.settings, ref.host)) return state
  const review = { ...state.review }
  let changed = false
  for (const raw of capture.fields) {
    const field = normalizeField({ ...raw, updatedAt: now }, now)
    if (!field || isEmptyValue(field) || alreadyApproved(state, ref.id, field)) continue
    const id = reviewIdFor(ref.id, field.key)
    const existing = review[id]
    const values = mergeCandidate(existing?.values ?? [], field, now)
    if (existing && values === existing.values) continue
    review[id] = {
      id,
      pageId: ref.id,
      url: ref.url,
      host: ref.host,
      path: ref.path,
      title: cleanText(capture.title, 200) ?? existing?.title ?? ref.host,
      field: fieldShape(field),
      values,
      updatedAt: now,
    }
    changed = true
  }
  return changed ? { ...state, review: trimReview(review) } : state
}

function withoutEntries(state: FormMemoryState, ids: Iterable<string>): FormMemoryState {
  const review = { ...state.review }
  let changed = false
  for (const id of ids) {
    if (!review[id]) continue
    delete review[id]
    changed = true
  }
  return changed ? { ...state, review } : state
}

/** Saves one reviewed value for its page, or for every site, and resolves the entry. */
export function approveReview(
  state: FormMemoryState,
  id: string,
  index: number,
  scope: ReviewScope,
  now: number,
): FormMemoryState {
  const entry = state.review[id]
  const candidate = entry?.values[index]
  if (!entry || !candidate) return state
  const field: MemoryField = { ...entry.field, value: candidate.value, display: candidate.display, updatedAt: now }
  const approved =
    scope === 'global'
      ? setGlobalField(state, field)
      : applyCapture(state, { url: entry.url, title: entry.title, fields: [field] }, now)
  return withoutEntries(approved, [id])
}

/** Approves the newest value of every entry, or of the given ones. */
export function approveAllReview(
  state: FormMemoryState,
  scope: ReviewScope,
  now: number,
  ids: string[] = Object.keys(state.review),
): FormMemoryState {
  return ids.reduce((current, id) => approveReview(current, id, 0, scope, now), state)
}

export function dismissReview(state: FormMemoryState, ids: string[]): FormMemoryState {
  return withoutEntries(state, ids)
}

export function dismissReviewValue(state: FormMemoryState, id: string, index: number): FormMemoryState {
  const entry = state.review[id]
  if (!entry?.values[index]) return state
  const values = entry.values.filter((_, position) => position !== index)
  if (values.length === 0) return withoutEntries(state, [id])
  return { ...state, review: { ...state.review, [id]: { ...entry, values } } }
}

export function restoreReview(state: FormMemoryState, entries: ReviewEntry[]): FormMemoryState {
  const review = { ...state.review }
  for (const entry of entries) review[entry.id] = entry
  return { ...state, review: trimReview(review) }
}

/** An explicit "save this page" stores what is on it, which answers everything pending there. */
export function resolvePageReview(state: FormMemoryState, pageId: string): FormMemoryState {
  return withoutEntries(
    state,
    Object.values(state.review)
      .filter((entry) => entry.pageId === pageId)
      .map((entry) => entry.id),
  )
}

export function pageReviewCount(state: FormMemoryState, pageId: string | undefined): number {
  if (!pageId) return 0
  return Object.values(state.review).filter((entry) => entry.pageId === pageId).length
}

export interface ReviewPageGroup {
  pageId: string
  title: string
  path: string
  url: string
  entries: ReviewEntry[]
}

export interface ReviewHostGroup {
  host: string
  pages: ReviewPageGroup[]
  count: number
  updatedAt: number
}

export function groupReviewByHost(state: FormMemoryState): ReviewHostGroup[] {
  const hosts = new Map<string, ReviewHostGroup>()
  const entries = Object.values(state.review).sort((a, b) => b.updatedAt - a.updatedAt)
  for (const entry of entries) {
    const host = hosts.get(entry.host) ?? { host: entry.host, pages: [], count: 0, updatedAt: entry.updatedAt }
    let page = host.pages.find((item) => item.pageId === entry.pageId)
    if (!page) {
      page = { pageId: entry.pageId, title: entry.title, path: entry.path, url: entry.url, entries: [] }
      host.pages.push(page)
    }
    page.entries.push(entry)
    host.count += 1
    hosts.set(entry.host, host)
  }
  return [...hosts.values()]
}
