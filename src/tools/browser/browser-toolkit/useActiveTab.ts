import { useCallback, useEffect, useRef, useState } from 'react'

export interface ActiveTab {
  id: number
  windowId: number
  url: string
  title: string
  favIconUrl?: string
  pinned: boolean
  muted: boolean
  audible: boolean
  incognito: boolean
  loading: boolean
}

function toActiveTab(tab: chrome.tabs.Tab | undefined): ActiveTab | null {
  if (!tab || tab.id == null) return null
  return {
    id: tab.id,
    windowId: tab.windowId,
    url: tab.url ?? tab.pendingUrl ?? '',
    title: tab.title ?? '',
    favIconUrl: tab.favIconUrl || undefined,
    pinned: tab.pinned,
    muted: Boolean(tab.mutedInfo?.muted),
    audible: Boolean(tab.audible),
    incognito: tab.incognito,
    loading: tab.status === 'loading',
  }
}

/** The active tab of this window, kept in sync with navigation, tab switches and zoom changes. */
export function useActiveTab() {
  const [tab, setTab] = useState<ActiveTab | null>(null)
  const [zoom, setZoom] = useState(1)
  const [ready, setReady] = useState(false)
  const tabIdRef = useRef<number | null>(null)

  useEffect(() => {
    tabIdRef.current = tab?.id ?? null
  }, [tab?.id])

  const refresh = useCallback(
    () =>
      chrome.tabs.query({ active: true, currentWindow: true }).then(async ([active]) => {
        const next = toActiveTab(active)
        setTab(next)
        setReady(true)
        if (next) setZoom(await chrome.tabs.getZoom(next.id).catch(() => 1))
      }),
    [],
  )

  useEffect(() => {
    void refresh()
    const onActivated = () => void refresh()
    const onUpdated = (_id: number, _info: chrome.tabs.OnUpdatedInfo, updated: chrome.tabs.Tab) => {
      if (updated.active) setTab((current) => (current && current.id === updated.id ? toActiveTab(updated) : current))
    }
    const onZoom = (info: chrome.tabs.OnZoomChangeInfo) => {
      if (tabIdRef.current === info.tabId) setZoom(info.newZoomFactor)
    }
    const onFocus = (windowId: number) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) void refresh()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onZoomChange.addListener(onZoom)
    chrome.windows.onFocusChanged.addListener(onFocus)
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onZoomChange.removeListener(onZoom)
      chrome.windows.onFocusChanged.removeListener(onFocus)
    }
  }, [refresh])

  return { tab, zoom, ready, refresh }
}
