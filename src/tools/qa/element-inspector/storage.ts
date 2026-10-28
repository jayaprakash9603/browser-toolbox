import { elementLabel } from '@/core/engines/selector/inspect'

import type { PickedElement } from './types'

const PICK_KEY = 'toolbox.pickedElement'
const HISTORY_KEY = 'toolbox.pickedElementHistory'
const HISTORY_MAX = 8

export interface HistoryItem {
  id: string
  at: number
  label: string
  result: PickedElement
}

function area(): chrome.storage.StorageArea | undefined {
  return chrome.storage?.session ?? chrome.storage?.local
}

function historyId(result: PickedElement): string {
  const selector = result.selectors.cssRelative || result.selectors.cssId || result.element.tag
  const { x, y, width, height } = result.element.dimensions
  return `${result.element.tag}:${selector}:${Math.round(x)}:${Math.round(y)}:${Math.round(width)}x${Math.round(height)}`
}

export async function loadPicked(): Promise<PickedElement | null> {
  const store = area()
  if (!store) return null
  const stored = (await store.get(PICK_KEY)) as Record<string, PickedElement | undefined>
  return stored[PICK_KEY] ?? null
}

export async function savePicked(result: PickedElement | null): Promise<void> {
  const store = area()
  if (!store) return
  if (result) await store.set({ [PICK_KEY]: result })
  else await store.remove(PICK_KEY)
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const store = area()
  if (!store) return []
  const stored = (await store.get(HISTORY_KEY)) as Record<string, HistoryItem[] | undefined>
  return stored[HISTORY_KEY] ?? []
}

export async function pushHistory(result: PickedElement): Promise<HistoryItem[]> {
  const next: HistoryItem = {
    id: historyId(result),
    at: Date.now(),
    label: elementLabel(result.element),
    result,
  }
  const existing = (await loadHistory()).filter((item) => item.id !== next.id)
  const history = [next, ...existing].slice(0, HISTORY_MAX)
  const store = area()
  if (store) await store.set({ [HISTORY_KEY]: history })
  return history
}

export async function clearHistory(): Promise<void> {
  const store = area()
  if (store) await store.remove(HISTORY_KEY)
}
