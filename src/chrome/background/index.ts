import { createLogger } from '@/core/logging'
import { startMessageRouter } from '@/core/messaging'
import { initStorage } from '@/core/storage'

import { getContextMenuActions } from '../context-menu/contextMenuService'

const logger = createLogger('background')

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: 'toolbox.open',
    title: chrome.i18n.getMessage('contextMenuOpen') || 'Open Browser Toolbox',
    contexts: ['all'],
  })
  getContextMenuActions().forEach((action) => {
    const contexts = action.contexts as [
      chrome.contextMenus.ContextType,
      ...chrome.contextMenus.ContextType[],
    ]
    chrome.contextMenus.create({
      id: action.id,
      title: action.title,
      contexts,
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  logger.info('installed')
  void initStorage().then(rebuildContextMenus)
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'toolbox.open' && tab?.windowId != null) {
    void chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-command-palette' && chrome.sidePanel) {
    logger.debug('command palette shortcut')
  }
})

startMessageRouter()
