import { createLogger } from '@/core/logging'
import { startMessageRouter } from '@/core/messaging'
import { stashPayload } from '@/core/payloads'
import { toolRegistry } from '@/core/registry'
import { initStorage } from '@/core/storage'

import { buildMenuItems } from '../context-menu/menuTree'

const logger = createLogger('background')

function contentScriptFile(): string | null {
  return chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0] ?? null
}

function findToolForMenuItem(menuItemId: string) {
  const match = /^toolbox\.tool\.([\w.-]+)\.(selection|link|image|page)$/.exec(menuItemId)
  if (!match) return null
  return { tool: toolRegistry.get(match[1]), surface: match[2] }
}

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: 'toolbox.open',
    title: chrome.i18n.getMessage('contextMenuOpen') || 'Open Browser Toolbox',
    contexts: ['all'],
  })
  for (const item of buildMenuItems(toolRegistry.getAll())) {
    chrome.contextMenus.create({
      id: item.id,
      title: item.title,
      contexts: item.contexts as [chrome.contextMenus.ContextType, ...chrome.contextMenus.ContextType[]],
      ...(item.parentId ? { parentId: item.parentId } : {}),
    })
  }
}

async function openPanelWithTool(
  tab: chrome.tabs.Tab | undefined,
  toolId: string,
  payload: { text?: string; linkUrl?: string; imageUrl?: string; pageUrl?: string },
) {
  await stashPayload({ toolId, ...payload })
  if (tab?.windowId != null) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId })
    } catch (error) {
      logger.warn('side panel open failed', error)
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  logger.info('installed')
  void initStorage().then(rebuildContextMenus)
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onStartup.addListener(() => {
  void rebuildContextMenus()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuItemId = String(info.menuItemId)
  if (menuItemId === 'toolbox.open' || menuItemId.startsWith('toolbox.open.')) {
    if (tab?.windowId != null) void chrome.sidePanel.open({ windowId: tab.windowId })
    return
  }
  const match = findToolForMenuItem(menuItemId)
  if (!match?.tool) return
  void openPanelWithTool(tab, match.tool.id, {
    text: info.selectionText,
    linkUrl: info.linkUrl,
    imageUrl: info.srcUrl,
    pageUrl: info.pageUrl,
  })
})

async function injectContentScript(tabId: number): Promise<boolean> {
  const file = contentScriptFile()
  if (!file) return false
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [file] })
    return true
  } catch (error) {
    logger.warn('content script injection failed', error)
    return false
  }
}

chrome.commands.onCommand.addListener((command, tab) => {
  void (async () => {
    if (tab?.windowId != null) {
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
  })()
})

startMessageRouter()
