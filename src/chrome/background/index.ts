import { addAllowlistHost, hostnameFromUrl } from '@/core/adblock'
import { createLogger } from '@/core/logging'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { startMessageRouter } from '@/core/messaging'
import { stashPayload } from '@/core/payloads'
import { toolRegistry } from '@/core/registry'
import { initStorage } from '@/core/storage'


import { registerAdblock, syncAdblockState } from './adblock'
import { registerProtection, syncProtectionState } from './protection'
import { registerSitesWhatsapp, registerSitesYoutube, syncYoutubeEnhancerState } from './sites'
import {
  bindChatPulseMenuRebuild,
  buildChatPulseMenus,
  isChatPulseMenuItem,
  registerChatPulseMenuSync,
  sendOpenAnalyticsToTab,
} from './sites/whatsappAnalytics'
import {
  bindImageConvertMenuRebuild,
  buildImageConvertMenus,
  handleImageConvertMenuClick,
  isImageConvertMenuItem,
  registerImageConvert,
} from './imageConvert'
import { executeToolboxCommand } from './executeCommand'
import {
  bindPipMenuRebuild,
  buildPipMenus,
  initPipOnStartup,
  isPipMenuItem,
  registerPip,
  togglePipInTab,
} from './pip'
import { initShortcutsOnStartup, registerShortcuts } from './shortcuts'
import { registerApiClientSendHandler } from './api-client-send'
import { registerCaptureHandler } from './capture'
import { registerHtmlBundleJobHandlers } from './htmlBundleJob'
import { buildMenuItems } from '../context-menu/menuTree'

const logger = createLogger('background')

function findToolForMenuItem(menuItemId: string) {
  const match = /^toolbox\.tool\.([\w.-]+)\.(selection|link|image|page)$/.exec(menuItemId)
  if (!match) return null
  return { tool: toolRegistry.get(match[1]), surface: match[2] }
}

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: 'toolbox.open',
    title: getChromeMessage('contextMenuOpen'),
    contexts: ['all'],
  })
  chrome.contextMenus.create({
    id: 'toolbox.adblock.pause-site',
    title: getChromeMessage('contextMenuPauseAdblock'),
    contexts: ['page', 'frame'],
  })
  for (const item of buildMenuItems(toolRegistry.getAll())) {
    chrome.contextMenus.create({
      id: item.id,
      title: item.title,
      contexts: item.contexts as [
        chrome.contextMenus.ContextType,
        ...chrome.contextMenus.ContextType[],
      ],
      ...(item.parentId ? { parentId: item.parentId } : {}),
    })
  }
  await buildImageConvertMenus()
  await buildPipMenus()
  await buildChatPulseMenus()
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
  void syncProtectionState()
  void syncYoutubeEnhancerState()
  void initPipOnStartup()
  void initShortcutsOnStartup()
})

chrome.runtime.onStartup.addListener(() => {
  void rebuildContextMenus()
  void syncAdblockState()
  void syncProtectionState()
  void syncYoutubeEnhancerState()
  void initPipOnStartup()
  void initShortcutsOnStartup()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuItemId = String(info.menuItemId)
  if (isImageConvertMenuItem(menuItemId)) {
    void handleImageConvertMenuClick(info, tab)
    return
  }
  if (isPipMenuItem(menuItemId)) {
    void togglePipInTab(tab)
    return
  }
  if (isChatPulseMenuItem(menuItemId) && tab?.id != null) {
    void sendOpenAnalyticsToTab(tab.id)
    return
  }
  if (menuItemId === 'toolbox.adblock.pause-site' && tab?.url) {
    const host = hostnameFromUrl(tab.url)
    if (host) void addAllowlistHost(host)
    return
  }
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

chrome.commands.onCommand.addListener((command, tab) => {
  void executeToolboxCommand(command, tab)
})

registerApiClientSendHandler()
registerCaptureHandler()
registerHtmlBundleJobHandlers()
registerAdblock()
registerProtection()
registerSitesYoutube()
registerSitesWhatsapp()
bindImageConvertMenuRebuild(rebuildContextMenus)
bindPipMenuRebuild(rebuildContextMenus)
bindChatPulseMenuRebuild(rebuildContextMenus)
registerChatPulseMenuSync()
registerImageConvert()
registerPip()
registerShortcuts()
startMessageRouter()
