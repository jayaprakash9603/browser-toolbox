import { addClipboardEntry } from '@/core/clipboard'
import { MAX_CLIPBOARD_CAPTURE_CHARS } from '@/core/clipboard/readCopySelection'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { getSettings, isPageClipboardCaptureOn, type Settings } from '@/features/settings/settingsService'

import { reconcileContentScripts } from './scriptRegistry'

const logger = createLogger('clipboard-capture')

const SCRIPT_ID = 'toolbox-clipboard-capture'
const SCRIPT_FILE = 'clipboard/capture.js'
const MAIN_SCRIPT_ID = 'toolbox-clipboard-capture-main'
const MAIN_SCRIPT_FILE = 'clipboard/capture-main.js'
const SCRIPT_IDS = [SCRIPT_ID, MAIN_SCRIPT_ID]

/** Copies are saved one at a time so rapid copies cannot overwrite each other's history write. */
let saveQueue: Promise<unknown> = Promise.resolve()

function captureScripts(): chrome.scripting.RegisteredContentScript[] {
  const base = {
    matches: ['http://*/*', 'https://*/*', 'file://*/*'],
    runAt: 'document_start' as const,
    allFrames: true,
  }
  return [
    { ...base, id: SCRIPT_ID, js: [SCRIPT_FILE] },
    // Page world: sees copy buttons that call navigator.clipboard / execCommand.
    { ...base, id: MAIN_SCRIPT_ID, js: [MAIN_SCRIPT_FILE], world: 'MAIN' },
  ]
}

async function syncCaptureScript(enabled: boolean): Promise<void> {
  try {
    await reconcileContentScripts(SCRIPT_IDS, enabled ? captureScripts() : [])
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}

/** Registered scripts miss tabs already open; inject so the next copy is caught without a reload. */
async function injectIntoOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*', 'file://*/*'] })
  for (const tab of tabs) {
    if (tab.id == null || tab.discarded) continue
    void chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: [SCRIPT_FILE] })
      .catch(() => undefined)
    void chrome.scripting
      .executeScript({ target: { tabId: tab.id, allFrames: true }, files: [MAIN_SCRIPT_FILE], world: 'MAIN' })
      .catch(() => undefined)
  }
}

export function registerClipboardCapture(): void {
  registerMessageHandler('CLIPBOARD_WATCH', async (message) => {
    if (message.type !== 'CLIPBOARD_WATCH') return
    // Capture no longer depends on the panel being open; kept for older callers.
    void message.active
  })

  registerMessageHandler('CLIPBOARD_CAPTURED', async (message) => {
    if (message.type !== 'CLIPBOARD_CAPTURED') return
    // Recorded whenever clipboard history is enabled, even if the panel/tab is closed.
    const text = message.text.slice(0, MAX_CLIPBOARD_CAPTURE_CHARS)
    saveQueue = saveQueue.then(() => addClipboardEntry(text)).catch(() => undefined)
    await saveQueue
  })

  void getSettings().then((settings) => syncCaptureScript(isPageClipboardCaptureOn(settings)))

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEYS.settings in changes)) return
    const prev = isPageClipboardCaptureOn(changes[STORAGE_KEYS.settings]?.oldValue as Partial<Settings> | undefined)
    const next = isPageClipboardCaptureOn(changes[STORAGE_KEYS.settings]?.newValue as Partial<Settings> | undefined)
    if (prev === next) return
    void syncCaptureScript(next)
    if (next) void injectIntoOpenTabs()
  })
}

export async function initClipboardCapture(): Promise<void> {
  const settings = await getSettings()
  const enabled = isPageClipboardCaptureOn(settings)
  await syncCaptureScript(enabled)
  if (enabled) await injectIntoOpenTabs()
}
