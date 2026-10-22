import { registerMessageHandler } from '@/core/messaging'
import type { ScreenshotMode } from '@/core/screenshot/types'
import { createLogger } from '@/core/logging'

import { captureViewerUrl } from '@/core/screenshot/viewerUrl'

import { getSession } from './session'
import { openScreenshotCaptureMenu } from './menu'
import { startScreenshot } from './start'

const logger = createLogger('screenshot-handlers')

export function registerScreenshotHandlers(): void {
  registerMessageHandler('SCREENSHOT_START', async (message, sender) => {
    if (message.type !== 'SCREENSHOT_START') return
    const mode = message.mode as ScreenshotMode
    const tab = sender.tab ?? (await activeTab())
    if (mode === 'batch-urls' && message.urls) {
      const id = await startScreenshot(mode, tab, {
        urls: message.urls,
        onProgress: (phase, current, total) => {
          broadcastProgress({ phase, current, total })
        },
      })
      return { sessionId: id }
    }
    const id = await startScreenshot(mode, tab, {
      onProgress: (phase, current, total) => broadcastProgress({ phase, current, total }),
    })
    return { sessionId: id }
  })

  registerMessageHandler('SCREENSHOT_GET_SESSION', async (message) => {
    if (message.type !== 'SCREENSHOT_GET_SESSION') return
    const session = getSession(message.sessionId)
    if (!session) throw new Error('Session expired or not found.')
    return { session }
  })

  registerMessageHandler('SCREENSHOT_MENU_OPEN', async (_message, sender) => {
    const tabId = sender.tab?.id ?? (await activeTab())?.id
    if (tabId == null) return { ok: false }
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: openScreenshotCaptureMenu,
      })
      return { ok: true }
    } catch (error) {
      logger.warn('menu inject failed', error)
      return { ok: false }
    }
  })

  registerMessageHandler('SCREENSHOT_BATCH_URLS', async (message, sender) => {
    if (message.type !== 'SCREENSHOT_BATCH_URLS') return
    const tab = sender.tab ?? (await activeTab())
    const id = await startScreenshot('batch-urls', tab, { urls: message.urls })
    return { sessionId: id }
  })

  registerMessageHandler('SCREENSHOT_MENU_ACTION', async (message) => {
    if (message.type !== 'SCREENSHOT_MENU_ACTION') return
    if (message.action === 'history' || message.action === 'options') {
      await chrome.tabs.create({
        url: captureViewerUrl({
          history: message.action === 'history',
          options: message.action === 'options',
        }),
      })
    }
  })
}

function broadcastProgress(payload: { phase: string; current: number; total: number }): void {
  void chrome.runtime.sendMessage({ type: 'SCREENSHOT_PROGRESS', ...payload }).catch(() => {})
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}
