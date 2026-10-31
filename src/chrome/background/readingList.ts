import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { stashPayload } from '@/core/payloads'

export const READING_LIST_TOOL_ID = 'productivity.reading-list'
export const READING_LIST_ROUTE = '/tools/productivity/reading-list'
export const READING_LIST_MENU_ID = 'toolbox.readingList.selection'

export function buildReadingListMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: READING_LIST_MENU_ID,
    parentId: 'toolbox.root',
    title: getChromeMessage('contextMenuReadingListSelection'),
    contexts: ['selection'],
  })
}

export function isReadingListMenuItem(menuItemId: string): boolean {
  return menuItemId === READING_LIST_MENU_ID
}

/** Stash and open in the same turn: awaiting before `sidePanel.open` can drop the user gesture. */
export function handleReadingListMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  const text = info.selectionText?.trim()
  const ready = Promise.all([
    text
      ? stashPayload({
          toolId: READING_LIST_TOOL_ID,
          text,
          pageUrl: info.pageUrl ?? tab?.url,
          ...(tab?.title ? { pageTitle: tab.title } : {}),
        })
      : Promise.resolve(true),
    setPanelRouteIntent(READING_LIST_ROUTE),
  ])
  const opened =
    tab?.windowId != null
      ? chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => undefined)
      : undefined
  return Promise.all([ready, opened]).then(() => undefined)
}
