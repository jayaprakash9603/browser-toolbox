import { HISTORY_MANAGER_ROUTE, HISTORY_MANAGER_TOOL_ID } from '@/core/history-manager'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { openExtensionPanel } from '@/platform/panel'

export const HM_MENU_PARENT = 'toolbox.history'
export const HM_OPEN_ID = 'toolbox.history.open'
export const HM_SEARCH_SELECTION_ID = 'toolbox.history.searchSelection'
export const HM_FIND_PAGE_ID = 'toolbox.history.findPage'
export const HM_DOMAIN_ID = 'toolbox.history.domain'

export function buildHistoryManagerMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: HM_MENU_PARENT,
    title: getChromeMessage('contextMenuHistoryParent') ?? 'History',
    contexts: ['all'],
  })
  create({
    id: HM_OPEN_ID,
    parentId: HM_MENU_PARENT,
    title: getChromeMessage('contextMenuHistoryOpen') ?? 'Open History Manager',
    contexts: ['all'],
  })
  create({
    id: HM_SEARCH_SELECTION_ID,
    parentId: HM_MENU_PARENT,
    title: getChromeMessage('contextMenuHistorySearchSelection') ?? 'Search "%s" in history',
    contexts: ['selection'],
  })
  create({
    id: HM_FIND_PAGE_ID,
    parentId: HM_MENU_PARENT,
    title: getChromeMessage('contextMenuHistoryFindPage') ?? 'Find this page in history',
    contexts: ['page', 'frame'],
  })
  create({
    id: HM_DOMAIN_ID,
    parentId: HM_MENU_PARENT,
    title: getChromeMessage('contextMenuHistoryDomain') ?? 'View history for this site',
    contexts: ['page', 'frame', 'link'],
  })
}

export function isHistoryManagerMenuItem(id: string): boolean {
  return (
    id === HM_OPEN_ID ||
    id === HM_SEARCH_SELECTION_ID ||
    id === HM_FIND_PAGE_ID ||
    id === HM_DOMAIN_ID
  )
}

function domainFromUrl(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

export async function handleHistoryManagerMenuClick(
  menuItemId: string,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  let route = HISTORY_MANAGER_ROUTE
  if (menuItemId === HM_SEARCH_SELECTION_ID && info.selectionText?.trim()) {
    const q = encodeURIComponent(info.selectionText.trim())
    route = `${HISTORY_MANAGER_ROUTE}?q=${q}&tab=timeline`
  }
  if (menuItemId === HM_FIND_PAGE_ID && info.pageUrl) {
    const q = encodeURIComponent(info.pageUrl)
    route = `${HISTORY_MANAGER_ROUTE}?q=${q}&tab=timeline`
  }
  if (menuItemId === HM_DOMAIN_ID) {
    const domain = domainFromUrl(info.linkUrl ?? info.pageUrl ?? tab?.url)
    if (domain) route = `${HISTORY_MANAGER_ROUTE}?domain=${encodeURIComponent(domain)}&tab=sites`
  }
  await setPanelRouteIntent(route)
  if (tab?.windowId != null) await openExtensionPanel({ windowId: tab.windowId, tabId: tab.id })
}

export { HISTORY_MANAGER_TOOL_ID }
