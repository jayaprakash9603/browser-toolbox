import { createLogger } from '@/core/logging'
import { startMessageRouter } from '@/core/messaging'
import { initStorage } from '@/core/storage'

import { registerAdblock, syncAdblockState } from './adblock'
import { enqueueContextMenuRebuild } from './contextMenus'
import {
  bindSiteQuickActionMenuRebuild,
  handleSiteQuickActionClick,
  isSiteQuickActionMenuItem,
  registerSiteQuickActionMenuSync,
} from './siteQuickActions'
import { registerProtection, syncProtectionState } from './protection'
import {
  registerSitesInstagram,
  registerSitesWhatsapp,
  registerSitesYoutube,
  syncInstagramEnhancerState,
  syncWhatsappPlusState,
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
import { initShortcutsOnStartup, registerShortcuts, resolveChromeCommand } from './shortcuts'
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
import { handleTaskMenuClick, isTaskMenuItem, registerTasks } from './tasks'
import { handleReadingListMenuClick, isReadingListMenuItem } from './readingList'
import { registerElementInspector } from './elementInspector'
import { registerFontInspector } from './fontInspector'
import { registerColorPicker } from './colorPicker'
import { screenshotModeFromMenuAction } from './screenshot/contextMenus'
import { startScreenshot } from './screenshot/start'
import type { ScreenshotMode } from '@/core/screenshot/types'
import { registerFormMemory } from './formMemory'
import { registerReactDevtools, syncReactDevtoolsState } from './reactDevtools'
import { registerScriptStudio } from './script-studio'
import { registerSidePanelNavigation } from './panelNavigation'
import { registerResponsiveViewerFraming } from './responsiveViewerFraming'
import { configurePanelAction, openExtensionPanel } from '@/platform/panel'

const logger = createLogger('background')

chrome.runtime.onInstalled.addListener(() => {
  logger.info('installed')
  safeStartup('initStorage', () => initStorage().then(() => enqueueContextMenuRebuild()))
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

// Site access is optional: registered scripts only run once it is granted, and open tabs need a push.
chrome.permissions.onAdded.addListener((added) => {
  if (!added.origins?.length) return
  safeStartup('adblock', () => syncAdblockState())
  safeStartup('protection', () => syncProtectionState())
  safeStartup('youtube', () => syncYoutubeEnhancerState())
  safeStartup('instagram', () => syncInstagramEnhancerState())
  safeStartup('whatsapp', () => syncWhatsappPlusState())
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
  if (isTaskMenuItem(menuItemId)) {
    void handleTaskMenuClick(info, tab)
    return
  }
  if (isReadingListMenuItem(menuItemId)) {
    void handleReadingListMenuClick(info, tab)
    return
  }
  if (isChatPulseMenuItem(menuItemId) && tab?.id != null) {
    void sendOpenAnalyticsToTab(tab.id)
    return
  }
  if (isSiteQuickActionMenuItem(menuItemId)) {
    void handleSiteQuickActionClick(menuItemId, tab, info.frameId ?? 0)
    return
  }
  if (menuItemId.startsWith('toolbox.screenshot.')) {
    const mode = screenshotModeFromMenuAction(menuItemId)
    if (mode) void startScreenshot(mode as ScreenshotMode, tab)
    return
  }
  if (menuItemId === 'toolbox.open' || menuItemId.startsWith('toolbox.open.')) {
    if (tab?.windowId != null) {
      void openExtensionPanel({ windowId: tab.windowId, tabId: tab.id })
    }
    return
  }
})

chrome.commands.onCommand.addListener((command, tab) => {
  void resolveChromeCommand(command).then((resolved) => executeToolboxCommand(resolved, tab))
})

const rebuildMenus = () => enqueueContextMenuRebuild()

safeRegister('panelAction', () => configurePanelAction().then(() => undefined))
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
bindSiteQuickActionMenuRebuild(rebuildMenus)
safeRegister('siteQuickActions', registerSiteQuickActionMenuSync)
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
safeRegister('tasks', registerTasks)
safeRegister('elementInspector', registerElementInspector)
safeRegister('fontInspector', registerFontInspector)
safeRegister('colorPicker', registerColorPicker)
safeRegister('formMemory', registerFormMemory)
safeRegister('reactDevtools', registerReactDevtools)
safeRegister('scriptStudio', registerScriptStudio)
safeRegister('panelNavigation', registerSidePanelNavigation)
safeRegister('responsiveViewerFraming', registerResponsiveViewerFraming)
startMessageRouter()
