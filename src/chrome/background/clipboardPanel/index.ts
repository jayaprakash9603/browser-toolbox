import { deleteEntry, getHistory, pinEntry, type ClipboardEntry } from '@/core/clipboard'
import { STORAGE_KEYS } from '@/core/constants'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

const logger = createLogger('clipboard-panel')

export const CLIPBOARD_PANEL_JS = 'inject/clipboard-panel.js'

function panelText() {
  return {
    title: getChromeMessage('clipboardPanelTitle'),
    search: getChromeMessage('clipboardPanelSearch'),
    empty: getChromeMessage('clipboardPanelEmpty'),
    copy: getChromeMessage('clipboardPanelCopy'),
    copied: getChromeMessage('colorCopied'),
    copyFailed: getChromeMessage('colorCopyFailed'),
    close: getChromeMessage('colorResultClose'),
    delete: getChromeMessage('clipboardPanelDelete'),
    pin: getChromeMessage('clipboardPanelPin'),
    unpin: getChromeMessage('clipboardPanelUnpin'),
    pinned: getChromeMessage('clipboardPinnedLabel'),
  }
}

function sortEntries(entries: ClipboardEntry[]): ClipboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt - a.createdAt
  })
}

async function injectClipboardPanel(tabId: number, entries: ClipboardEntry[]): Promise<void> {
  const payload = {
    entries: sortEntries(entries).slice(0, 80),
    text: panelText(),
    storageKey: STORAGE_KEYS.clipboardHistory,
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (data: Record<string, unknown>) => {
      ;(window as Window & { __TBX_CLIPBOARD_PANEL__?: Record<string, unknown> }).__TBX_CLIPBOARD_PANEL__ = data
    },
    args: [payload],
  })
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [CLIPBOARD_PANEL_JS],
  })
}

export async function openClipboardPanelOnTab(tab?: chrome.tabs.Tab): Promise<void> {
  if (tab?.id == null || isRestrictedCaptureUrl(tab.url)) return
  try {
    const entries = await getHistory()
    await injectClipboardPanel(tab.id, entries)
  } catch (error) {
    logger.warn('clipboard panel inject failed', error)
  }
}

export function registerClipboardPanel(): void {
  registerMessageHandler('CLIPBOARD_PANEL_MUTATE', async (message) => {
    if (message.type !== 'CLIPBOARD_PANEL_MUTATE') return
    if (message.op === 'delete') await deleteEntry(message.id)
    else if (message.op === 'pin') await pinEntry(message.id, Boolean(message.pinned))
    return { ok: true as const }
  })
}
