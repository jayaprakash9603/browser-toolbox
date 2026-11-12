import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'

import { registerContextMenuOnShown } from './contextMenuShown'
import { buildImageConvertMenus } from './imageConvert'
import { buildPipMenus } from './pip'
import { buildChatPulseMenus } from './sites/whatsappAnalytics'
import { buildRecorderMenus } from './recorder/contextMenus'
import { buildScreenshotMenus } from './screenshot/contextMenus'
import { buildSiteQuickActionMenus } from './siteQuickActions'
import { buildTaskMenus } from './tasks'
import { buildReadingListMenus } from './readingList'

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
  await chrome.contextMenus.removeAll()
  createContextMenu({
    id: 'toolbox.open',
    title: getChromeMessage('contextMenuOpen'),
    contexts: ['all'],
  })
  buildSiteQuickActionMenus(createContextMenu)
  const builders = [
    { name: 'imageConvert', run: buildImageConvertMenus },
    { name: 'pip', run: buildPipMenus },
    { name: 'chatPulse', run: buildChatPulseMenus },
  ]
  try {
    buildScreenshotMenus(createContextMenu)
  } catch (error) {
    logger.warn('screenshot menu build failed', error)
  }
  try {
    buildRecorderMenus(createContextMenu)
  } catch (error) {
    logger.warn('recorder menu build failed', error)
  }
  try {
    buildTaskMenus(createContextMenu)
  } catch (error) {
    logger.warn('tasks menu build failed', error)
  }
  try {
    buildReadingListMenus(createContextMenu)
  } catch (error) {
    logger.warn('reading list menu build failed', error)
  }
  for (const { name, run } of builders) {
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
