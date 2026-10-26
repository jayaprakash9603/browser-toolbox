import { isCapturableUrl } from './model'

export interface ActivePage {
  tabId: number
  url: string
  title: string
  favIconUrl?: string
}

function toActivePage(tab: chrome.tabs.Tab | undefined): ActivePage | null {
  const url = tab?.url ?? tab?.pendingUrl
  if (tab?.id == null || !isCapturableUrl(url)) return null
  return {
    tabId: tab.id,
    url,
    title: tab.title?.trim() || url,
    ...(tab.favIconUrl ? { favIconUrl: tab.favIconUrl } : {}),
  }
}

export async function getActivePage(): Promise<ActivePage | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return toActivePage(tab)
  } catch {
    return null
  }
}

/** The web page in front of the user, kept current across tab switches and navigation. */
export function watchActivePage(listener: (page: ActivePage | null) => void): () => void {
  let live = true
  const refresh = () =>
    void getActivePage().then((page) => {
      if (live) listener(page)
    })
  const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
    if (tab.active && (info.url || info.title || info.favIconUrl || info.status === 'complete')) refresh()
  }
  const onFocus = (windowId: number) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) refresh()
  }
  refresh()
  chrome.tabs.onActivated?.addListener(refresh)
  chrome.tabs.onUpdated?.addListener(onUpdated)
  chrome.windows?.onFocusChanged?.addListener(onFocus)
  return () => {
    live = false
    chrome.tabs.onActivated?.removeListener(refresh)
    chrome.tabs.onUpdated?.removeListener(onUpdated)
    chrome.windows?.onFocusChanged?.removeListener(onFocus)
  }
}
