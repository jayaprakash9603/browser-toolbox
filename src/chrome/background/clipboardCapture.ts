import { addClipboardEntry } from '@/core/clipboard'
import { MAX_CLIPBOARD_CAPTURE_CHARS } from '@/core/clipboard/readCopySelection'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { getSettings } from '@/features/settings/settingsService'

import { reconcileContentScripts } from './scriptRegistry'

const logger = createLogger('clipboard-capture')

const SCRIPT_ID = 'toolbox-clipboard-capture'
const SCRIPT_FILE = 'clipboard/capture.js'
/** Session flag: the Clipboard Manager is on screen and should record copies. */
const WATCH_KEY = 'clipboardWatch'

function captureScript(): chrome.scripting.RegisteredContentScript {
  return {
    id: SCRIPT_ID,
    js: [SCRIPT_FILE],
    matches: ['http://*/*', 'https://*/*', 'file://*/*'],
    runAt: 'document_start',
    allFrames: true,
  }
}

async function syncCaptureScript(enabled: boolean): Promise<void> {
  try {
    await reconcileContentScripts([SCRIPT_ID], enabled ? [captureScript()] : [])
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
  }
}

export function registerClipboardCapture(): void {
  registerMessageHandler('CLIPBOARD_WATCH', async (message) => {
    if (message.type !== 'CLIPBOARD_WATCH') return
    await chrome.storage.session.set({ [WATCH_KEY]: message.active })
  })

  registerMessageHandler('CLIPBOARD_CAPTURED', async (message) => {
    if (message.type !== 'CLIPBOARD_CAPTURED') return
    const stored = await chrome.storage.session.get(WATCH_KEY)
    if (stored[WATCH_KEY] !== true) return
    await addClipboardEntry(message.text.slice(0, MAX_CLIPBOARD_CAPTURE_CHARS))
  })

  void getSettings().then((settings) => syncCaptureScript(settings.clipboardHistoryEnabled))

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEYS.settings in changes)) return
    const next = changes[STORAGE_KEYS.settings]?.newValue as
      { clipboardHistoryEnabled?: boolean } | undefined
    void syncCaptureScript(next?.clipboardHistoryEnabled !== false)
  })
}

export async function initClipboardCapture(): Promise<void> {
  const settings = await getSettings()
  await syncCaptureScript(settings.clipboardHistoryEnabled)
  if (settings.clipboardHistoryEnabled) await injectIntoOpenTabs()
}
