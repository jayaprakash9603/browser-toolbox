import { useEffect, useState } from 'react'

export type ActiveTab = { id: number | null; url: string | null }

export function useActiveTab(): ActiveTab {
  const [tab, setTab] = useState<ActiveTab>({ id: null, url: null })

  useEffect(() => {
    let activeId: number | null = null
    const read = () => {
      void chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        activeId = tabs[0]?.id ?? null
        const url = tabs[0]?.url ?? null
        setTab((prev) => (prev.id === activeId && prev.url === url ? prev : { id: activeId, url }))
      })
    }
    const onUpdated = (tabId: number, info: { url?: string; status?: string }) => {
      if (tabId === activeId && (info.url || info.status)) read()
    }
    read()
    chrome.tabs.onActivated.addListener(read)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      chrome.tabs.onActivated.removeListener(read)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [])

  return tab
}

export function useActiveTabUrl() {
  return useActiveTab().url
}
