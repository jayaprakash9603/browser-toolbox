import { addAllowlistHost, hostnameFromUrl } from '@/core/adblock'
import { createLogger } from '@/core/logging'
import { startMessageRouter } from '@/core/messaging'
import { stashPayload } from '@/core/payloads'
import { toolRegistry } from '@/core/registry'
import { initStorage } from '@/core/storage'

import { registerAdblock, syncAdblockState } from './adblock'
import { enqueueContextMenuRebuild } from './contextMenus'
import { registerProtection, syncProtectionState } from './protection'
import {
  registerSitesInstagram,
  registerSitesWhatsapp,
  registerSitesYoutube,
  syncInstagramEnhancerState,
  syncYoutubeEnhancerState,
} from './sites'
import {
  bindChatPulseMenuRebuild,
  isChatPulseMenuItem,
  registerChatPulseMenuSync,
  sendOpenAnalyticsToTab,
} from './sites/whatsappAnalytics'
import {
  bindImageConvertMenuRebuild,
  handleImageConvertMenuClick,
  isImageConvertMenuItem,
  registerImageConvert,
} from './imageConvert'
import { executeToolboxCommand } from './executeCommand'
import {
  bindPipMenuRebuild,
  initPipOnStartup,
  isPipMenuItem,
  registerPip,
  togglePipInTab,
} from './pip'
import { initShortcutsOnStartup, registerShortcuts } from './shortcuts'
import { registerApiClientSendHandler } from './api-client-send'
import { registerCaptureHandler } from './capture'
import { registerScreenshotHandlers } from './screenshot'
import { registerRecorder } from './recorder'
import { registerHtmlBundleJobHandlers } from './htmlBundleJob'
import { registerImageDownloadJobHandlers } from './imageDownloadJob'
import { registerNetMonitor } from './netmon'
import { registerToolbarIcon } from './toolbarIcon'
import { registerInterceptor } from './interceptor'
import { registerLinkChecker } from './web/linkChecker'
import { registerScraperJobHandlers } from './scraper/job'
import { registerRedirectTracer } from './web/redirectTracer'
import { safeRegister, safeStartup } from './safeInit'
import { initClipboardCapture, registerClipboardCapture } from './clipboardCapture'
import { registerTimer } from './timer'
import { registerReactDevtools, syncReactDevtoolsState } from './reactDevtools'

const logger = createLogger('background')

function findToolForMenuItem(menuItemId: string) {
  const match = /^toolbox\.tool\.([\w.-]+)\.(selection|link|image|page)$/.exec(menuItemId)
  if (!match) return null
  return { tool: toolRegistry.get(match[1]), surface: match[2] }
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
  safeStartup('initStorage', () => initStorage().then(() => enqueueContextMenuRebuild()))
  safeStartup('sidePanel', () =>
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }),
  )
  safeStartup('protection', () => syncProtectionState())
  safeStartup('youtube', () => syncYoutubeEnhancerState())
  safeStartup('instagram', () => syncInstagramEnhancerState())
  safeStartup('pip', () => initPipOnStartup())
  safeStartup('shortcuts', () => initShortcutsOnStartup())
  safeStartup('clipboardCapture', () => initClipboardCapture())
  safeStartup('reactDevtools', () => syncReactDevtoolsState())
})

chrome.runtime.onStartup.addListener(() => {
  safeStartup('contextMenus', () => enqueueContextMenuRebuild())
  safeStartup('adblock', () => syncAdblockState())
  safeStartup('protection', () => syncProtectionState())
  safeStartup('youtube', () => syncYoutubeEnhancerState())
  safeStartup('instagram', () => syncInstagramEnhancerState())
  safeStartup('pip', () => initPipOnStartup())
  safeStartup('shortcuts', () => initShortcutsOnStartup())
  safeStartup('clipboardCapture', () => initClipboardCapture())
  safeStartup('reactDevtools', () => syncReactDevtoolsState())
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
  if (menuItemId.startsWith('toolbox.screenshot.')) {
    void import('./screenshot/contextMenus').then(({ screenshotModeFromMenuAction }) => {
      const mode = screenshotModeFromMenuAction(menuItemId)
      if (!mode) return
      void import('./screenshot/start').then(({ startScreenshot }) => {
        void startScreenshot(mode as import('@/core/screenshot/types').ScreenshotMode, tab)
      })
    })
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

const rebuildMenus = () => enqueueContextMenuRebuild()

safeRegister('apiClientSend', registerApiClientSendHandler)
safeRegister('capture', registerCaptureHandler)
safeRegister('screenshot', registerScreenshotHandlers)
safeRegister('recorder', registerRecorder)
safeRegister('htmlBundleJob', registerHtmlBundleJobHandlers)
safeRegister('imageDownloadJob', registerImageDownloadJobHandlers)
safeRegister('adblock', registerAdblock)
safeRegister('protection', registerProtection)
safeRegister('sitesYoutube', registerSitesYoutube)
safeRegister('sitesWhatsapp', registerSitesWhatsapp)
safeRegister('sitesInstagram', registerSitesInstagram)
bindImageConvertMenuRebuild(rebuildMenus)
bindPipMenuRebuild(rebuildMenus)
bindChatPulseMenuRebuild(rebuildMenus)
safeRegister('chatPulseMenuSync', registerChatPulseMenuSync)
safeRegister('imageConvert', registerImageConvert)
safeRegister('pip', registerPip)
safeRegister('shortcuts', registerShortcuts)
safeRegister('toolbarIcon', registerToolbarIcon)
safeRegister('netMonitor', registerNetMonitor)
safeRegister('interceptor', registerInterceptor)
safeRegister('redirectTracer', registerRedirectTracer)
safeRegister('linkChecker', registerLinkChecker)
safeRegister('scraper', registerScraperJobHandlers)
safeRegister('clipboardCapture', registerClipboardCapture)
safeRegister('timer', registerTimer)
safeRegister('reactDevtools', registerReactDevtools)
startMessageRouter()
