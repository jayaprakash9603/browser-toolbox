import { PIP_MENU_ID } from '@/core/pip'
import { createLogger } from '@/core/logging'

import { refreshSiteQuickActionMenus } from './siteQuickActions'
import { tabHasPlayableVideo } from './pip'

const logger = createLogger('context-menu-shown')

function isHttpTab(tab?: chrome.tabs.Tab): boolean {
  const url = tab?.url
  if (!url) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

async function refreshPipMenuVisibility(info: chrome.contextMenus.OnShownInfo, tab?: chrome.tabs.Tab): Promise<void> {
  if (!chrome.contextMenus.update) return
  const onVideo = info.contextTypes?.includes('video') ?? false
  if (onVideo) {
    void chrome.contextMenus.update(PIP_MENU_ID, { visible: true })
    return
  }
  if (!isHttpTab(tab) || tab?.id == null) {
    void chrome.contextMenus.update(PIP_MENU_ID, { visible: false })
    return
  }
  try {
    const hasVideo = await tabHasPlayableVideo(tab.id)
    void chrome.contextMenus.update(PIP_MENU_ID, { visible: hasVideo })
  } catch (error) {
    logger.debug('pip menu visibility check failed', error)
    void chrome.contextMenus.update(PIP_MENU_ID, { visible: false })
  }
}

export function registerContextMenuOnShown(): void {
  const api = chrome.contextMenus as typeof chrome.contextMenus & {
    onShown?: { addListener: (fn: (info: chrome.contextMenus.OnShownInfo, tab?: chrome.tabs.Tab) => void) => void }
  }
  if (!api.onShown) return

  api.onShown.addListener((info, tab) => {
    void refreshSiteQuickActionMenus(tab)
    void refreshPipMenuVisibility(info, tab)
  })
}
