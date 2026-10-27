import { DEFAULT_CLIPBOARD_HISTORY_LIMIT, MAX_CLIPBOARD_HISTORY_LIMIT, STORAGE_KEYS } from '@/core/constants'
import { eventBus } from '@/core/events'
import { requestPermissions } from '@/core/permissions/siteAccess'
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
  const history = await get<unknown>(STORAGE_KEYS.clipboardHistory)
  return Array.isArray(history) ? history.filter(isClipboardEntry) : []
}

function isClipboardEntry(value: unknown): value is ClipboardEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry.id === 'string'
    && typeof entry.text === 'string'
    && typeof entry.createdAt === 'number'
    && Number.isFinite(entry.createdAt)
    && typeof entry.pinned === 'boolean'
    && typeof entry.charCount === 'number'
    && Number.isFinite(entry.charCount)
    && typeof entry.wordCount === 'number'
    && Number.isFinite(entry.wordCount)
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

export async function restoreEntry(entry: ClipboardEntry): Promise<void> {
  const rest = (await getHistory()).filter((item) => item.id !== entry.id && item.text !== entry.text)
  await saveHistory([entry, ...rest].sort((a, b) => b.createdAt - a.createdAt))
  eventBus.emit('CLIPBOARD_UPDATED', { entryId: entry.id })
}

export async function clearHistory(includePinned = false): Promise<void> {
  if (includePinned) {
    await remove(STORAGE_KEYS.clipboardHistory)
    return
  }
  await saveHistory((await getHistory()).filter((entry) => entry.pinned))
}

/** clipboardRead is optional; the prompt only appears when this runs from a click or key press. */
export function ensureClipboardReadPermission(): Promise<boolean> {
  return requestPermissions({ permissions: ['clipboardRead'] })
}

export async function readClipboardText(): Promise<string> {
  await ensureClipboardReadPermission()
  return navigator.clipboard.readText()
}

export async function writeClipboardText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

function insertTextIntoPage(value: string): boolean {
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart ?? active.value.length
    const end = active.selectionEnd ?? start
    active.setRangeText(value, start, end, 'end')
    active.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }
  if (active instanceof HTMLElement && active.isContentEditable) {
    return document.execCommand('insertText', false, value)
  }
  return false
}

export async function pasteClipboardEntry(text: string): Promise<'page' | 'clipboard'> {
  await writeClipboardText(text)
  if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript || !chrome.tabs?.query) {
    return 'clipboard'
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id == null) return 'clipboard'
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: insertTextIntoPage,
      args: [text],
    })
    return result?.result ? 'page' : 'clipboard'
  } catch {
    return 'clipboard'
  }
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
