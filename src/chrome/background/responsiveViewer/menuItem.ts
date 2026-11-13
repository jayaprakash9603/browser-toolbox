import { getChromeMessage } from '@/core/i18n/chromeMessages'

import { SIMULATOR_PARENT_ID } from './ids'

export function buildSimulatorMenus(create: (properties: chrome.contextMenus.CreateProperties) => void): void {
  // Leaf item: Chrome will not fire clicks on a parent that has children.
  // `all` keeps it visible on a normal page right-click (same as Open One Panel).
  create({
    id: SIMULATOR_PARENT_ID,
    title: getChromeMessage('contextMenuSimulator') ?? 'Mobile Simulator',
    contexts: ['all'],
  })
}
