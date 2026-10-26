import { getToolboxCommand } from '@/core/commands'
import { createLogger } from '@/core/logging'
import { requestOpenCommandPalette } from '@/core/panel/navigationSession'
import { contentScriptBundlePath, ensureContentScriptInTab, getActiveBrowserTab } from '@/chrome/contentScriptClient'

import { togglePipInTab } from './pip'
import { addPageAsTask } from './tasks'
import { pickColorOnPage } from './colorPicker'
import { openScreenshotCaptureMenu } from './screenshot/menu'
import { modeFromCommand, startScreenshot } from './screenshot/start'

const logger = createLogger('commands')

async function injectContentScript(tabId: number): Promise<boolean> {
  if (!contentScriptBundlePath()) return false
  try {
    await ensureContentScriptInTab(tabId)
    return true
  } catch (error) {
    logger.warn('content script injection failed', error)
    return false
  }
}

function startSidePanelOpen(windowId: number | undefined): Promise<void> | undefined {
  if (windowId == null) return undefined
  return chrome.sidePanel.open({ windowId }).catch((error) => {
    logger.warn('side panel open failed', error)
  })
}

export async function executeToolboxCommand(command: string, tab?: chrome.tabs.Tab): Promise<void> {
  if (command === 'toggle-pip') {
    await togglePipInTab(tab)
    return
  }
  if (command === 'toggle-recording') {
    const { toggleRecorderFromCommand } = await import('./recorder')
    await toggleRecorderFromCommand(tab)
    return
  }
  if (command === 'add-page-task') {
    await addPageAsTask(tab)
    return
  }

  if (command === 'pick-color') {
    await pickColorOnPage(tab)
    return
  }

  const def = getToolboxCommand(command)
  const opensPanel = def?.opensPanel ?? command !== 'toggle-pip'

  const paletteIntent =
    command === 'open-command-palette' ? requestOpenCommandPalette() : undefined
  const openStarted = opensPanel ? startSidePanelOpen(tab?.windowId) : undefined

  let resolvedTab = tab
  if (opensPanel && tab?.windowId == null) {
    resolvedTab = (await getActiveBrowserTab()) ?? tab
    if (resolvedTab?.windowId != null && openStarted === undefined) {
      await startSidePanelOpen(resolvedTab.windowId)
    }
  }

  if (openStarted) await openStarted
  if (paletteIntent) await paletteIntent

  switch (command) {
    case 'open-command-palette':
      break
    case 'pick-element': {
      const pickTab = resolvedTab ?? tab
      if (pickTab?.id != null) {
        const injected = await injectContentScript(pickTab.id)
        if (injected) {
          const { stashPayload } = await import('@/core/payloads')
          await stashPayload({ toolId: 'qa.element-inspector', pageUrl: pickTab.url })
          try {
            await chrome.tabs.sendMessage(pickTab.id, { type: 'PICK_ELEMENT_START' })
          } catch (error) {
            logger.warn('picker start failed', error)
          }
        }
      }
      break
    }
    case 'capture-screenshot':
    case 'capture-entire':
    case 'capture-visible':
    case 'capture-selection':
    case 'capture-element': {
      const mode = modeFromCommand(command)
      if (mode) await startScreenshot(mode, resolvedTab ?? tab)
      break
    }
    case 'capture-menu': {
      const menuTab = resolvedTab ?? tab
      if (menuTab?.id != null) {
        await chrome.scripting.executeScript({
          target: { tabId: menuTab.id },
          func: openScreenshotCaptureMenu,
        })
      }
      break
    }
    default:
      logger.debug('unknown command', command)
  }
}
