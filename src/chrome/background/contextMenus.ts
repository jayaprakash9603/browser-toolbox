import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { toolRegistry } from '@/core/registry'

import { buildMenuItems } from '../context-menu/menuTree'
import { buildImageConvertMenus } from './imageConvert'
import { buildPipMenus } from './pip'
import { buildChatPulseMenus } from './sites/whatsappAnalytics'
import { buildScreenshotMenus } from './screenshot/contextMenus'

const logger = createLogger('context-menus')

let rebuildQueue: Promise<void> = Promise.resolve()

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
  createContextMenu({
    id: 'toolbox.adblock.pause-site',
    title: getChromeMessage('contextMenuPauseAdblock'),
    contexts: ['page', 'frame'],
  })
  for (const item of buildMenuItems(toolRegistry.getAll())) {
    createContextMenu({
      id: item.id,
      title: item.title,
      contexts: item.contexts as [
        chrome.contextMenus.ContextType,
        ...chrome.contextMenus.ContextType[],
      ],
      ...(item.parentId ? { parentId: item.parentId } : {}),
    })
  }
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
  rebuildQueue = rebuildQueue
    .then(() => rebuildContextMenusOnce())
    .catch((error) => logger.warn('context menu rebuild failed', error))
  return rebuildQueue
}
