import {
  BOOKMARK_HEALTH_ALARM,
  BOOKMARK_REMINDER_PREFIX,
  BOOKMARKS_ROUTE,
  BOOKMARKS_TOOL_ID,
  assignCollection,
  itemMeta,
  loadBookmarkWorkspace,
  saveBookmarkWorkspace,
  upsertItem,
} from '@/core/bookmarks'
import { runScheduledHealthScan } from './healthScan'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { stashPayload } from '@/core/payloads'
import { requestPermissions } from '@/core/permissions/siteAccess'
import { openExtensionPanel } from '@/platform/panel'

export const BM_PARENT = 'toolbox.bookmarks'
export const BM_PAGE = 'toolbox.bookmarks.page'
export const BM_LINK = 'toolbox.bookmarks.link'
export const BM_FAVORITE = 'toolbox.bookmarks.favorite'
export const BM_COLLECTION = 'toolbox.bookmarks.collection'
export const BM_READING = 'toolbox.bookmarks.reading'
export const BM_NOTE = 'toolbox.bookmarks.note'
export const BM_OPEN = 'toolbox.bookmarks.open'
const COLLECTION_PREFIX = 'toolbox.bookmarks.collection.'

export function isBookmarkMenuItem(id: string): boolean {
  return id === BM_PARENT || id.startsWith('toolbox.bookmarks.')
}

export function buildBookmarkMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: BM_PARENT,
    title: getChromeMessage('contextMenuBookmarksParent'),
    contexts: ['page', 'frame', 'link', 'selection'],
  })
  create({ id: BM_PAGE, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksPage'), contexts: ['page', 'frame'] })
  create({ id: BM_LINK, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksLink'), contexts: ['link'] })
  create({ id: BM_FAVORITE, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksFavorite'), contexts: ['page', 'frame', 'link'] })
  create({ id: BM_COLLECTION, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksCollection'), contexts: ['page', 'frame', 'link'] })
  create({ id: BM_READING, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksReading'), contexts: ['page', 'frame', 'link'] })
  create({ id: BM_NOTE, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksNote'), contexts: ['selection'] })
  create({ id: BM_OPEN, parentId: BM_PARENT, title: getChromeMessage('contextMenuBookmarksOpen'), contexts: ['page', 'frame', 'link', 'selection'] })
  void addCollectionChildren(create)
}

async function addCollectionChildren(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): Promise<void> {
  try {
    const workspace = await loadBookmarkWorkspace()
    Object.values(workspace.collections)
      .slice(0, 8)
      .forEach((collection) => {
        create({
          id: COLLECTION_PREFIX + collection.id,
          parentId: BM_COLLECTION,
          title: collection.name,
          contexts: ['page', 'frame', 'link'],
        })
      })
  } catch {
    return
  }
}

export async function handleBookmarkMenuClick(
  menuItemId: string,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  if (menuItemId === BM_OPEN) {
    await openOrganizer(tab)
    return
  }
  if (menuItemId === BM_NOTE) {
    await stashPayload({
      toolId: BOOKMARKS_TOOL_ID,
      text: info.selectionText?.trim(),
      pageUrl: info.pageUrl ?? tab?.url,
      pageTitle: tab?.title,
    })
    await openOrganizer(tab)
    return
  }
  const url = menuItemId === BM_LINK ? info.linkUrl : info.pageUrl ?? tab?.url
  const title = tab?.title || url || 'Bookmark'
  if (!url || !/^https?:/i.test(url)) return
  if (!(await requestPermissions({ permissions: ['bookmarks'] }))) return
  const created = await saveOrFind(title, url)
  if (!created) return
  if (menuItemId === BM_FAVORITE) await patchItem(created.id, { favorite: true })
  if (menuItemId === BM_READING) await patchItem(created.id, { readingStatus: 'unread' })
  if (menuItemId.startsWith(COLLECTION_PREFIX)) {
    const collectionId = menuItemId.slice(COLLECTION_PREFIX.length)
    const workspace = await loadBookmarkWorkspace()
    await saveBookmarkWorkspace(assignCollection(workspace, created.id, collectionId, true))
  }
}

async function saveOrFind(title: string, url: string): Promise<chrome.bookmarks.BookmarkTreeNode | null> {
  const matches = await chrome.bookmarks.search({ url })
  if (matches[0]) return matches[0]
  const tree = await chrome.bookmarks.getTree()
  const parent = defaultFolderId(tree)
  return chrome.bookmarks.create({ parentId: parent, title, url })
}

function defaultFolderId(nodes: chrome.bookmarks.BookmarkTreeNode[]): string {
  const root = nodes[0]?.children?.find((node) => node.id === '1') ?? nodes[0]?.children?.[0]
  return root?.id ?? '1'
}

async function patchItem(id: string, patch: Parameters<typeof upsertItem>[2]): Promise<void> {
  const workspace = await loadBookmarkWorkspace()
  await saveBookmarkWorkspace(upsertItem(workspace, id, { ...itemMeta(workspace, id), ...patch }))
}

async function openOrganizer(tab?: chrome.tabs.Tab): Promise<void> {
  await setPanelRouteIntent(BOOKMARKS_ROUTE)
  if (tab?.windowId != null) await openExtensionPanel({ windowId: tab.windowId, tabId: tab.id })
}

export function registerBookmarkAlarms(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === BOOKMARK_HEALTH_ALARM) {
      void runScheduledHealthScan()
      return
    }
    if (!alarm.name.startsWith(BOOKMARK_REMINDER_PREFIX)) return
    void chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: getChromeMessage('bookmarkReminderTitle'),
      message: getChromeMessage('contextMenuBookmarksReading'),
    })
  })
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes['toolbox.bookmarks.workspace.v1']) return
    void syncReminderAlarms()
  })
  void syncReminderAlarms()
}

async function syncReminderAlarms(): Promise<void> {
  const workspace = await loadBookmarkWorkspace()
  const alarms = await chrome.alarms.getAll()
  for (const alarm of alarms) {
    if (alarm.name.startsWith(BOOKMARK_REMINDER_PREFIX)) await chrome.alarms.clear(alarm.name)
  }
  for (const [id, item] of Object.entries(workspace.items)) {
    if (!item.reminderAt || item.reminderAt <= Date.now()) continue
    await chrome.alarms.create(BOOKMARK_REMINDER_PREFIX + id, { when: item.reminderAt })
  }
  if (workspace.prefs.healthSchedule === 'daily') {
    await chrome.alarms.create(BOOKMARK_HEALTH_ALARM, { periodInMinutes: 24 * 60 })
  } else {
    await chrome.alarms.clear(BOOKMARK_HEALTH_ALARM)
  }
}
