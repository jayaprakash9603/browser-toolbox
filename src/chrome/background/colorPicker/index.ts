import {
  COLOR_PICKER_ROUTE,
  PALETTE_GENERATOR_ROUTE,
  normalizeHex,
  pageFormatFor,
  isColorFormat,
} from '@/core/color-picker/model'
import { loadColorPickerState, recordPickedColor } from '@/core/color-picker/storage'
import { getActiveWebTab } from '@/chrome/contentScriptClient'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { openExtensionPanel } from '@/platform/panel'

import {
  runColorPicker,
  runScreenColorPick,
  type ColorPickerPageText,
} from './page'

const logger = createLogger('color-picker')

let running = false

function pageText(): ColorPickerPageText {
  return {
    copied: getChromeMessage('colorCopied'),
    copyFailed: getChromeMessage('colorCopyFailed'),
    hintPick: getChromeMessage('colorHintPick'),
    hintZoom: getChromeMessage('colorHintZoom'),
    hintFormat: getChromeMessage('colorHintFormat'),
    hintKeep: getChromeMessage('colorHintKeep'),
    hintExit: getChromeMessage('colorHintExit'),
    resultTitle: getChromeMessage('colorResultTitle'),
    copyHex: getChromeMessage('colorCopyHex'),
    copyRgb: getChromeMessage('colorCopyRgb'),
    copyHsl: getChromeMessage('colorCopyHsl'),
    copyHsv: getChromeMessage('colorCopyHsv'),
    close: getChromeMessage('colorResultClose'),
    shadesLabel: getChromeMessage('colorShadesLabel'),
    generatePalette: getChromeMessage('colorGeneratePalette'),
  }
}

export async function openPaletteGenerator(hex: string, windowId: number | undefined): Promise<void> {
  const normalized = normalizeHex(hex)
  if (!normalized) return
  const route = `${PALETTE_GENERATOR_ROUTE}?color=${encodeURIComponent(normalized)}`
  const intent = setPanelRouteIntent(route)
  if (windowId != null) await openExtensionPanel({ windowId })
  await intent
}

/** Pages Chrome will not let us capture or script open the panel tool instead. */
async function openPanelFallback(windowId: number | undefined): Promise<void> {
  const intent = setPanelRouteIntent(COLOR_PICKER_ROUTE)
  if (windowId != null) await openExtensionPanel({ windowId })
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

export async function pickColorFromScreen(tab?: chrome.tabs.Tab): Promise<void> {
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
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: target.id },
        func: runScreenColorPick,
        args: [{ format: pageFormatFor(state.format), text: pageText() }],
      })
      if (injection?.result?.ok) return
      logger.warn('screen picker unavailable', injection?.result?.error)
    } catch (error) {
      logger.warn('screen picker failed', error)
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

  registerMessageHandler('COLOR_OPEN_PALETTE', async (message, sender) => {
    if (message.type !== 'COLOR_OPEN_PALETTE') return
    await openPaletteGenerator(message.hex, sender.tab?.windowId)
    return { ok: true }
  })
}
