import { stashPayload } from '@/core/payloads'
import { createLogger } from '@/core/logging'

import { contentScriptBundlePath, ensureContentScriptInTab } from '@/chrome/contentScriptClient'

import { togglePipInTab } from './pip'

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

export async function executeToolboxCommand(command: string, tab?: chrome.tabs.Tab): Promise<void> {
  if (command === 'toggle-pip') {
    await togglePipInTab(tab)
    return
  }

  if (command !== 'toggle-pip' && tab?.windowId != null) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId })
    } catch (error) {
      logger.warn('side panel open failed', error)
    }
  }

  switch (command) {
    case 'open-command-palette':
      await stashPayload({ toolId: 'command-palette' })
      break
    case 'pick-element': {
      if (tab?.id != null) {
        const injected = await injectContentScript(tab.id)
        if (injected) {
          await stashPayload({ toolId: 'qa.element-inspector', pageUrl: tab.url })
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'PICK_ELEMENT_START' })
          } catch (error) {
            logger.warn('picker start failed', error)
          }
        }
      }
      break
    }
    case 'capture-screenshot':
      await stashPayload({ toolId: 'screenshots.capture', pageUrl: tab?.url })
      break
    default:
      logger.debug('unknown command', command)
  }
}
