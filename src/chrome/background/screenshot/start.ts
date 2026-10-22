import { loadScreenshotSettings } from '@/core/screenshot/settings'
import { captureViewerUrl } from '@/core/screenshot/viewerUrl'
import type { ScreenshotMode, ScreenshotSession } from '@/core/screenshot/types'
import { createLogger } from '@/core/logging'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import {
  captureElementFrame,
  captureEntirePageFrame,
  captureSelectionFrame,
  captureVisibleFrame,
} from './capture'
import { createSession } from './session'

const logger = createLogger('screenshot')

function newSessionId(): string {
  return `ss_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export type ProgressCallback = (phase: string, current: number, total: number) => void

async function openEditorForSession(sessionId: string): Promise<void> {
  await chrome.tabs.create({ url: captureViewerUrl({ session: sessionId }) })
}

async function runAfterCapture(sessionId: string, dataUrl?: string): Promise<void> {
  const settings = await loadScreenshotSettings()
  if (settings.afterCapture === 'editor') {
    await openEditorForSession(sessionId)
    return
  }
  if (settings.afterCapture === 'clipboard' && dataUrl) {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    } catch (error) {
      logger.warn('clipboard after capture failed', error)
      await openEditorForSession(sessionId)
    }
    return
  }
  await openEditorForSession(sessionId)
}

export async function startScreenshot(
  mode: ScreenshotMode,
  tab?: chrome.tabs.Tab,
  options?: { urls?: string[]; onProgress?: ProgressCallback },
): Promise<string | null> {
  const sessionId = newSessionId()
  const frames: ScreenshotSession['frames'] = []

  try {
    if (mode === 'batch-urls') {
      const urls = (options?.urls ?? []).map((u) => u.trim()).filter(Boolean)
      if (urls.length === 0) throw new Error('No URLs provided.')
      const settings = await loadScreenshotSettings()
      const win = await chrome.windows.create({ url: urls[0], focused: true, type: 'normal' })
      if (!win) throw new Error('Could not open batch window.')
      const tabId = win.tabs?.[0]?.id
      const windowId = win.id
      if (tabId == null || windowId == null) throw new Error('Could not open batch window.')

      for (let i = 0; i < urls.length; i++) {
        options?.onProgress?.('batch-urls', i + 1, urls.length)
        const url = urls[i]
        const t = await chrome.tabs.get(tabId)
        if (t.url !== url) {
          await chrome.tabs.update(tabId, { url })
          await waitTabComplete(tabId)
        }
        await sleepMs(settings.batchUrlDelayMs)
        const captureTab = await chrome.tabs.get(tabId)
        const frame = await captureEntirePageFrame(captureTab)
        frame.label = url
        frames.push(frame)
      }
      try {
        await chrome.windows.remove(windowId)
      } catch {
        /* ignore */
      }
    } else if (mode === 'all-tabs') {
      if (!tab?.windowId) throw new Error('No active window.')
      const settings = await loadScreenshotSettings()
      const tabs = await chrome.tabs.query({ windowId: tab.windowId })
      const originalId = tab.id
      const capturable = tabs.filter(
        (t) => t.id != null && /^(https?|file):/i.test(t.url ?? '') && !isRestrictedCaptureUrl(t.url),
      )
      const skipped = tabs
        .filter((t) => !capturable.includes(t) && t.url && !isOwnExtensionPage(t.url))
        .map(tabLabel)
      try {
        for (let i = 0; i < capturable.length; i++) {
          const t = capturable[i]
          options?.onProgress?.('all-tabs', i + 1, capturable.length)
          try {
            await chrome.tabs.update(t.id!, { active: true })
            await sleepMs(400)
            const fresh = await chrome.tabs.get(t.id!)
            const frame =
              settings.allTabsMode === 'entire'
                ? await captureEntirePageFrame(fresh)
                : await captureVisibleFrame(fresh)
            frame.label = tabLabel(fresh)
            frames.push(frame)
          } catch (error) {
            logger.warn('all-tabs: skipped tab', t.url, error)
            skipped.push(tabLabel(t))
          }
        }
      } finally {
        if (originalId != null) {
          await chrome.tabs.update(originalId, { active: true }).catch(() => undefined)
        }
      }
      if (frames.length === 0) {
        throw new Error('None of the tabs in this window can be captured (browser and Web Store pages are protected).')
      }
      if (skipped.length > 0) {
        const notice = `Skipped ${skipped.length} tab${skipped.length === 1 ? '' : 's'} the browser doesn't allow capturing: ${skipped.join(', ')}`
        for (const frame of frames) frame.notice = frame.notice ? `${frame.notice} ${notice}` : notice
      }
    } else {
      if (!tab?.id) throw new Error('No active tab.')
      const fresh = await chrome.tabs.get(tab.id)
      let frame
      switch (mode) {
        case 'visible':
          frame = await captureVisibleFrame(fresh)
          break
        case 'entire':
          frame = await captureEntirePageFrame(fresh)
          break
        case 'selection':
          frame = await captureSelectionFrame(fresh)
          if (!frame) return null
          break
        case 'element':
          frame = await captureElementFrame(fresh)
          if (!frame) return null
          break
        default:
          throw new Error(`Unknown mode: ${mode}`)
      }
      frames.push(frame)
    }

    const session: ScreenshotSession = {
      id: sessionId,
      createdAt: Date.now(),
      mode,
      frames,
    }
    createSession(session)

    const preview = frames[0]?.dataUrl ?? frames[0]?.slices?.[0]?.dataUrl
    await runAfterCapture(sessionId, preview)
    return sessionId
  } catch (error) {
    logger.warn('screenshot failed', error)
    const message = error instanceof Error ? error.message : 'Capture failed.'
    chrome.notifications?.create?.({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Screenshot failed',
      message,
    })
    return null
  }
}

function tabLabel(tab: chrome.tabs.Tab): string {
  return tab.title || tab.url || `Tab ${tab.id}`
}

function isOwnExtensionPage(url: string): boolean {
  return url.startsWith(chrome.runtime.getURL(''))
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (updatedId: number, info: { status?: string }) => {
      if (updatedId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }, 60_000)
  })
}

export function modeFromCommand(command: string): ScreenshotMode | null {
  switch (command) {
    case 'capture-screenshot':
    case 'capture-entire':
      return 'entire'
    case 'capture-visible':
      return 'visible'
    case 'capture-selection':
      return 'selection'
    case 'capture-element':
      return 'element'
    case 'capture-menu':
      return null
    default:
      return null
  }
}
