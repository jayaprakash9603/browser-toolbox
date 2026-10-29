import { get, set } from '@/core/storage'
import { STORAGE_KEYS } from '@/core/constants'
import type { FrameworkId, RankMode, SelectorCandidate, Uniqueness } from '@/core/engines/selector-studio'

export const HISTORY_LIMIT = 50

export interface HistoryEntry {
  id: string
  at: number
  name?: string
  favorite?: boolean
  pageUrl: string
  kind: 'css' | 'xpath'
  expression: string
  strategy: string
  framework?: FrameworkId
  matchCount: number | null
  uniqueness: Uniqueness
}

export interface StudioSettings {
  rankMode: RankMode
  defaultFramework: FrameworkId
  autoHighlight: boolean
}

export interface StudioStore {
  history: HistoryEntry[]
  settings: StudioSettings
}

export const DEFAULT_SETTINGS: StudioSettings = {
  rankMode: 'stable',
  defaultFramework: 'playwright',
  autoHighlight: false,
}

function normalize(store?: Partial<StudioStore>): StudioStore {
  return {
    history: store?.history ?? [],
    settings: { ...DEFAULT_SETTINGS, ...store?.settings },
  }
}

export async function loadStudioStore(): Promise<StudioStore> {
  return normalize(await get<StudioStore>(STORAGE_KEYS.selectorStudio))
}

export async function saveStudioSettings(settings: StudioSettings): Promise<void> {
  const current = await loadStudioStore()
  await set(STORAGE_KEYS.selectorStudio, { ...current, settings })
}

export function entryFromCandidate(
  candidate: SelectorCandidate,
  pageUrl: string,
  extras?: Partial<HistoryEntry>,
): HistoryEntry {
  return {
    id: `${pageUrl}|${candidate.kind}|${candidate.expression}`,
    at: Date.now(),
    pageUrl,
    kind: candidate.kind,
    expression: candidate.expression,
    strategy: candidate.strategy,
    matchCount: candidate.matchCount,
    uniqueness: candidate.uniqueness,
    ...extras,
  }
}

export async function pushHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const current = await loadStudioStore()
  const rest = current.history.filter((item) => item.id !== entry.id)
  const previous = current.history.find((item) => item.id === entry.id)
  const next = [{ ...previous, ...entry, favorite: previous?.favorite ?? entry.favorite }, ...rest].slice(
    0,
    HISTORY_LIMIT,
  )
  await set(STORAGE_KEYS.selectorStudio, { ...current, history: next })
  return next
}

export async function updateHistory(id: string, patch: Partial<HistoryEntry>): Promise<HistoryEntry[]> {
  const current = await loadStudioStore()
  const history = current.history.map((item) => (item.id === id ? { ...item, ...patch } : item))
  await set(STORAGE_KEYS.selectorStudio, { ...current, history })
  return history
}

export async function removeHistory(id: string): Promise<HistoryEntry[]> {
  const current = await loadStudioStore()
  const history = current.history.filter((item) => item.id !== id)
  await set(STORAGE_KEYS.selectorStudio, { ...current, history })
  return history
}

export async function clearHistory(): Promise<void> {
  const current = await loadStudioStore()
  await set(STORAGE_KEYS.selectorStudio, { ...current, history: current.history.filter((item) => item.favorite) })
}

export function exportHistory(history: HistoryEntry[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), history }, null, 2)
}

export function importHistory(text: string, existing: HistoryEntry[]): HistoryEntry[] {
  const parsed = JSON.parse(text) as { history?: HistoryEntry[] }
  const incoming = Array.isArray(parsed.history) ? parsed.history : []
  const merged = [...incoming, ...existing]
  const seen = new Set<string>()
  const unique: HistoryEntry[] = []
  for (const item of merged) {
    if (!item?.id || !item.expression || seen.has(item.id)) continue
    seen.add(item.id)
    unique.push(item)
    if (unique.length >= HISTORY_LIMIT) break
  }
  return unique
}
