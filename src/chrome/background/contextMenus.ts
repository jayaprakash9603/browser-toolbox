import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { resolveContextMenuVisibility } from '@/core/settings/contextMenuVisibility'
import { getSettings } from '@/features/settings/settingsService'

import { registerContextMenuOnShown } from './contextMenuShown'
import { buildImageConvertMenus } from './imageConvert'
import { buildPipMenus } from './pip'
import { buildChatPulseMenus } from './sites/whatsappAnalytics'
import { buildRecorderMenus } from './recorder/contextMenus'
import { buildScreenshotMenus } from './screenshot/contextMenus'
import { buildClipboardPanelMenus } from './clipboardPanel/menus'
import { buildColorPickerMenus } from './colorPicker/menus'
import { buildSiteQuickActionMenus } from './siteQuickActions'
import { buildTaskMenus } from './tasks'
import { buildReadingListMenus } from './readingList'
import { buildDownloadManagerMenus } from './download-manager/menus'

const logger = createLogger('context-menus')

let rebuildQueue: Promise<void> = Promise.resolve()
let onShownRegistered = false

function ensureContextMenuOnShown(): void {
  if (onShownRegistered) return
  onShownRegistered = true
  registerContextMenuOnShown()
}

function createContextMenu(properties: chrome.contextMenus.CreateProperties): void {
  chrome.contextMenus.create(properties, () => {
    const err = chrome.runtime.lastError
    if (err && !/duplicate id/i.test(err.message ?? '')) {
      logger.warn('contextMenus.create failed', properties.id, err.message)
    }
  })
}

async function rebuildContextMenusOnce(): Promise<void> {
  const settings = await getSettings()
  const menu = resolveContextMenuVisibility(settings)

  await chrome.contextMenus.removeAll()
  if (menu.openPanel) {
    createContextMenu({
      id: 'toolbox.open',
      title: getChromeMessage('contextMenuOpen'),
      contexts: ['all'],
    })
  }
  if (menu.siteQuickActions) buildSiteQuickActionMenus(createContextMenu)
  if (menu.colorPicker) buildColorPickerMenus(createContextMenu)
  if (menu.clipboardHistory && settings.clipboardHistoryEnabled) {
    buildClipboardPanelMenus(createContextMenu)
  }
  const builders: { name: string; run: () => void | Promise<void>; enabled: boolean }[] = [
    { name: 'imageConvert', run: buildImageConvertMenus, enabled: menu.saveImageAs },
    { name: 'pip', run: buildPipMenus, enabled: menu.pictureInPicture },
    { name: 'chatPulse', run: buildChatPulseMenus, enabled: menu.chatPulse },
  ]
  if (menu.screenshot) {
    try {
      buildScreenshotMenus(createContextMenu)
    } catch (error) {
      logger.warn('screenshot menu build failed', error)
    }
  }
  if (menu.screenRecorder) {
    try {
      buildRecorderMenus(createContextMenu)
    } catch (error) {
      logger.warn('recorder menu build failed', error)
    }
  }
  if (menu.tasks) {
    try {
      buildTaskMenus(createContextMenu)
    } catch (error) {
      logger.warn('tasks menu build failed', error)
    }
  }
  if (menu.readingList) {
    try {
      buildReadingListMenus(createContextMenu)
    } catch (error) {
      logger.warn('reading list menu build failed', error)
    }
  }
  if (menu.downloadManager) {
    try {
      buildDownloadManagerMenus(createContextMenu)
    } catch (error) {
      logger.warn('download manager menu build failed', error)
    }
  }
  for (const { name, run, enabled } of builders) {
    if (!enabled) continue
    try {
      await run()
    } catch (error) {
      logger.warn(`${name} menu build failed`, error)
    }
  }
}

/** Serializes overlapping rebuild requests (storage listeners, install, startup). */
export function enqueueContextMenuRebuild(): Promise<void> {
  ensureContextMenuOnShown()
  rebuildQueue = rebuildQueue
    .then(() => rebuildContextMenusOnce())
    .catch((error) => logger.warn('context menu rebuild failed', error))
  return rebuildQueue
}
