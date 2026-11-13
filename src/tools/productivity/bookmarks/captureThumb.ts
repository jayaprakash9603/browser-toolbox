import { saveBookmarkThumbnail } from '@/core/bookmarks'

export async function openBookmarkWithThumb(bookmarkId: string, url: string): Promise<void> {
  const tab = await chrome.tabs.create({ url, active: true })
  if (tab.id == null || tab.windowId == null) return
  const tabId = tab.id
  const windowId = tab.windowId
  const onUpdated = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
    if (id !== tabId || info.status !== 'complete') return
    chrome.tabs.onUpdated.removeListener(onUpdated)
    void capture(windowId, bookmarkId)
  }
  chrome.tabs.onUpdated.addListener(onUpdated)
  window.setTimeout(() => chrome.tabs.onUpdated.removeListener(onUpdated), 20000)
}

async function capture(windowId: number, bookmarkId: string): Promise<void> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 50 })
    if (dataUrl) await saveBookmarkThumbnail(bookmarkId, dataUrl)
  } catch {
    return
  }
}
