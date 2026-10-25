import { getScriptStudioSettings } from '@/core/script-studio'

import { getMenuCommandsForTab } from './bridge'
import { scriptStudioPageUrl } from './install'
import { executeScriptOnTab } from './registration'

const MENU_ROOT = 'toolbox.script-studio'

export function registerScriptStudioContextMenus(rebuild: () => void): void {
  void getScriptStudioSettings().then((settings) => {
    if (!settings.contextMenuEnabled) return
    try {
      chrome.contextMenus.create({
        id: MENU_ROOT,
        title: 'Script Studio',
        contexts: ['page'],
      })
      chrome.contextMenus.create({
        id: `${MENU_ROOT}.dashboard`,
        parentId: MENU_ROOT,
        title: 'Open Dashboard',
        contexts: ['page'],
      })
    } catch {
      rebuild()
    }
  })
}

export function isScriptStudioMenuItem(id: string): boolean {
  return id.startsWith(MENU_ROOT)
}

export async function handleScriptStudioMenuClick(
  menuItemId: string,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  if (menuItemId === `${MENU_ROOT}.dashboard`) {
    void chrome.tabs.create({ url: scriptStudioPageUrl() })
    return
  }
  if (menuItemId.startsWith(`${MENU_ROOT}.run.`) && tab?.id != null) {
    const scriptId = menuItemId.slice(`${MENU_ROOT}.run.`.length)
    await executeScriptOnTab(tab.id, scriptId)
  }
  if (menuItemId.startsWith(`${MENU_ROOT}.cmd.`) && tab?.id != null) {
    /* menu command click handled via stored commands — run script callback not available cross-world */
  }
}

export async function rebuildScriptStudioMenuItems(tabId: number): Promise<chrome.contextMenus.CreateProperties[]> {
  const settings = await getScriptStudioSettings()
  if (!settings.contextMenuEnabled) return []
  const items: chrome.contextMenus.CreateProperties[] = []
  const commands = getMenuCommandsForTab(tabId)
  for (const cmd of commands) {
    items.push({
      id: `${MENU_ROOT}.cmd.${cmd.id}`,
      parentId: MENU_ROOT,
      title: cmd.name,
      contexts: ['page'],
    })
  }
  return items
}
