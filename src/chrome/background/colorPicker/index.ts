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
import { isExtensionMessage, type ExtensionResponse } from '@/core/messaging/types'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { openExtensionPanel } from '@/platform/panel'

import { COLOR_PICKER_JS } from './injectPaths'
import type { ColorPickerPageText } from './page'

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
    copyAgain: getChromeMessage('colorCopyAgain'),
    pickPageAgain: getChromeMessage('colorPickPageAgain'),
    pickScreenAgain: getChromeMessage('colorPickScreenAgain'),
    clickToPick: getChromeMessage('colorClickToPick'),
    clickToCancel: getChromeMessage('colorClickToCancel'),
  }
}

/** Must run synchronously in the user-gesture turn (see `registerColorPicker` listener). */
function openPaletteGeneratorFromUserGesture(hex: string, tab?: chrome.tabs.Tab): void {
  const normalized = normalizeHex(hex)
  if (!normalized) return
  const route = `${PALETTE_GENERATOR_ROUTE}?color=${encodeURIComponent(normalized)}&_g=${Date.now()}`
  void setPanelRouteIntent(route).then(() => {
    void chrome.runtime.sendMessage({ type: 'PANEL_ROUTE_APPLY', route }).catch(() => undefined)
  })
  void openExtensionPanel({ windowId: tab?.windowId, tabId: tab?.id })
}

/** Pages Chrome will not let us capture or script open the panel tool instead. */
async function openPanelFallback(tab?: chrome.tabs.Tab): Promise<void> {
  const intent = setPanelRouteIntent(COLOR_PICKER_ROUTE)
  const open = openExtensionPanel({ windowId: tab?.windowId, tabId: tab?.id })
  await Promise.all([intent, open])
}

async function injectColorPicker(
  tabId: number,
  opts: Record<string, unknown>,
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (payload: Record<string, unknown>) => {
      ;(window as Window & { __TBX_COLOR_PICK__?: Record<string, unknown> }).__TBX_COLOR_PICK__ = payload
    },
    args: [opts],
  })
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [COLOR_PICKER_JS],
  })
}

/** Prefer a scriptable web tab: the sender/command tab, else the focused window's page. */
async function resolvePickTab(tab?: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined> {
  if (tab?.id != null && !isRestrictedCaptureUrl(tab.url)) return tab
  const active = await getActiveWebTab()
  if (active?.id != null && !isRestrictedCaptureUrl(active.url)) return active
  return tab?.id != null ? tab : active
}

async function captureVisiblePng(tab: chrome.tabs.Tab): Promise<string | undefined> {
  try {
    if (tab.windowId != null) {
      return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
    }
    return await chrome.tabs.captureVisibleTab({ format: 'png' })
  } catch (error) {
    logger.warn('visible tab capture failed', error)
    return undefined
  }
}

async function injectPageLoupe(tab: chrome.tabs.Tab, image: string, format: ReturnType<typeof pageFormatFor>): Promise<void> {
  if (tab.id == null) return
  await injectColorPicker(tab.id, {
    mode: 'page',
    forceLoupe: true,
    image,
    format,
    text: pageText(),
  })
}

/**
 * Page pick from a command / context menu has no page user-activation, so EyeDropper.open()
 * would fail silently. Capture the tab (activeTab is granted) and open the magnifier loupe.
 */
export async function pickColorOnPage(tab?: chrome.tabs.Tab): Promise<void> {
  if (running) return
  running = true
  try {
    const [target, state] = await Promise.all([resolvePickTab(tab), loadColorPickerState()])
    if (target?.id == null || isRestrictedCaptureUrl(target.url)) {
      await openPanelFallback(target)
      return
    }
    const format = pageFormatFor(state.format)
    try {
      const image = await captureVisiblePng(target)
      if (image) {
        await injectPageLoupe(target, image, format)
        return
      }
      await injectColorPicker(target.id, {
        mode: 'page',
        format,
        text: pageText(),
      })
      return
    } catch (error) {
      logger.warn('page picker failed', error)
    }
    await openPanelFallback(target)
  } finally {
    running = false
  }
}

/**
 * Screen pick injects EyeDropper. Without a page gesture the script arms a click-to-pick overlay
 * so the next click is a valid user activation.
 */
export async function pickColorFromScreen(tab?: chrome.tabs.Tab): Promise<void> {
  if (running) return
  running = true
  try {
    const [target, state] = await Promise.all([resolvePickTab(tab), loadColorPickerState()])
    if (target?.id == null || isRestrictedCaptureUrl(target.url)) {
      await openPanelFallback(target)
      return
    }
    try {
      await injectColorPicker(target.id, {
        mode: 'screen',
        format: pageFormatFor(state.format),
        text: pageText(),
      })
      return
    } catch (error) {
      logger.warn('screen picker failed', error)
    }
    await openPanelFallback(target)
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

  registerMessageHandler('COLOR_PICK_START', async (_message, sender) => {
    await pickColorOnPage(sender.tab)
    return { started: true }
  })

  registerMessageHandler('COLOR_PICK_SCREEN', async (_message, sender) => {
    await pickColorFromScreen(sender.tab)
    return { started: true }
  })

  registerMessageHandler('COLOR_PICK_LOUPE', async (_message, sender) => {
    const tab = await resolvePickTab(sender.tab)
    if (tab?.id == null || isRestrictedCaptureUrl(tab.url)) return { ok: false as const }
    const state = await loadColorPickerState()
    const image = await captureVisiblePng(tab)
    if (!image) return { ok: false as const }
    await injectPageLoupe(tab, image, pageFormatFor(state.format))
    return { ok: true as const }
  })

  // Async message router breaks the user gesture before `sidePanel.open()`; handle in sync turn.
  chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
    if (!isExtensionMessage(raw) || raw.type !== 'COLOR_OPEN_PALETTE') return false
    openPaletteGeneratorFromUserGesture(raw.hex, sender.tab)
    sendResponse({ ok: true, data: { ok: true } } satisfies ExtensionResponse)
    return true
  })
}
