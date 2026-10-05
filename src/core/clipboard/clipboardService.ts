import { DEFAULT_CLIPBOARD_HISTORY_LIMIT, MAX_CLIPBOARD_HISTORY_LIMIT, STORAGE_KEYS } from '@/core/constants'
import { eventBus } from '@/core/events'
import { get, remove, set } from '@/core/storage'
import { getSettings } from '@/features/settings/settingsService'

export interface ClipboardEntry {
  id: string
  text: string
  createdAt: number
  pinned: boolean
  charCount: number
  wordCount: number
}

function makeEntry(text: string, pinned = false): ClipboardEntry {
  const trimmed = text.trim()
  return {
    id: crypto.randomUUID(),
    text,
    createdAt: Date.now(),
    pinned,
    charCount: text.length,
    wordCount: trimmed ? trimmed.split(/\s+/).length : 0,
  }
}

export async function getHistory(): Promise<ClipboardEntry[]> {
  return (await get<ClipboardEntry[]>(STORAGE_KEYS.clipboardHistory)) ?? []
}

async function saveHistory(entries: ClipboardEntry[]) {
  const settings = await getSettings()
  const limit = Math.min(settings.clipboardHistoryLimit || DEFAULT_CLIPBOARD_HISTORY_LIMIT, MAX_CLIPBOARD_HISTORY_LIMIT)
  const pinned = entries.filter((e) => e.pinned)
  const unpinned = entries.filter((e) => !e.pinned).slice(0, limit)
  await set(STORAGE_KEYS.clipboardHistory, [...unpinned, ...pinned])
}

export async function addClipboardEntry(text: string): Promise<ClipboardEntry | undefined> {
  if (!text.trim()) return undefined
  const settings = await getSettings()
  if (!settings.clipboardHistoryEnabled) return undefined

  const history = await getHistory()
  const existing = history.find((entry) => entry.text === text)
  if (existing) {
    const updated = { ...existing, createdAt: Date.now() }
    const rest = history.filter((entry) => entry.id !== existing.id)
    await saveHistory([updated, ...rest])
    eventBus.emit('CLIPBOARD_UPDATED', { entryId: updated.id })
    return updated
  }

  const entry = makeEntry(text)
  await saveHistory([entry, ...history])
  eventBus.emit('CLIPBOARD_UPDATED', { entryId: entry.id })
  return entry
}

export async function pinEntry(id: string, pinned: boolean): Promise<void> {
  const history = await getHistory()
  await saveHistory(history.map((entry) => (entry.id === id ? { ...entry, pinned } : entry)))
}

export async function deleteEntry(id: string): Promise<void> {
  await saveHistory((await getHistory()).filter((entry) => entry.id !== id))
}

export async function clearHistory(includePinned = false): Promise<void> {
  if (includePinned) {
    await remove(STORAGE_KEYS.clipboardHistory)
    return
  }
  await saveHistory((await getHistory()).filter((entry) => entry.pinned))
}

export async function readClipboardText(): Promise<string> {
  return navigator.clipboard.readText()
}

export async function writeClipboardText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export async function captureClipboard(): Promise<ClipboardEntry | undefined> {
  try {
    const text = await readClipboardText()
    if (!text) return undefined
    return await addClipboardEntry(text)
  } catch {
    return undefined
  }
}
