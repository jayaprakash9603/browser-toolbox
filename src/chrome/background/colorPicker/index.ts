import { COLOR_PICKER_ROUTE, normalizeHex, pageFormatFor, isColorFormat } from '@/core/color-picker/model'
import { loadColorPickerState, recordPickedColor } from '@/core/color-picker/storage'
import { getActiveWebTab } from '@/chrome/contentScriptClient'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { runColorPicker, type ColorPickerPageOptions } from './page'

const logger = createLogger('color-picker')

let running = false

function pageText(): ColorPickerPageOptions['text'] {
  return {
    copied: getChromeMessage('colorCopied'),
    copyFailed: getChromeMessage('colorCopyFailed'),
    hintPick: getChromeMessage('colorHintPick'),
    hintZoom: getChromeMessage('colorHintZoom'),
    hintFormat: getChromeMessage('colorHintFormat'),
    hintKeep: getChromeMessage('colorHintKeep'),
    hintExit: getChromeMessage('colorHintExit'),
  }
}

/** Pages Chrome will not let us capture or script open the panel tool instead. */
async function openPanelFallback(windowId: number | undefined): Promise<void> {
  const intent = setPanelRouteIntent(COLOR_PICKER_ROUTE)
  if (windowId != null) await chrome.sidePanel.open({ windowId }).catch(() => undefined)
  await intent
}

/**
 * Freezes the visible tab, then lets the user pick from a magnifier loupe. Works with the side
 * panel closed: everything runs in the page and the background, never in the panel.
 */
export async function pickColorOnPage(tab?: chrome.tabs.Tab): Promise<void> {
  if (running) return
  running = true
  try {
    const target = tab?.id != null && tab.url ? tab : ((await getActiveWebTab()) ?? tab)
    if (target?.id == null || isRestrictedCaptureUrl(target.url)) {
      await openPanelFallback(target?.windowId)
      return
    }
    const state = await loadColorPickerState()
    try {
      const image = await chrome.tabs.captureVisibleTab(target.windowId, { format: 'png' })
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: target.id },
        func: runColorPicker,
        args: [{ image, format: pageFormatFor(state.format), text: pageText() }],
      })
      if (injection?.result?.ok) return
      logger.warn('page picker unavailable', injection?.result?.error)
    } catch (error) {
      logger.warn('page picker failed', error)
    }
    await openPanelFallback(target.windowId)
  } finally {
    running = false
  }
}

export function registerColorPicker(): void {
  registerMessageHandler('COLOR_PICKED', async (message, sender) => {
    if (message.type !== 'COLOR_PICKED') return
    if (!normalizeHex(message.hex)) return
    const url = message.url ?? sender.tab?.url
    await recordPickedColor(message.hex, isColorFormat(message.format) ? message.format : undefined, url)
  })

  registerMessageHandler('COLOR_PICK_START', async () => {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    await pickColorOnPage(active)
    return { started: true }
  })
}
