import { useEffect, useState } from 'react'

import { classifyTabUrl, getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { onSiteAccessChanged, originPatternForUrl } from '@/core/permissions/siteAccess'

export interface ActiveTabAccess {
  url: string
  host: string
  granted: boolean
}

async function probeActiveTab(): Promise<ActiveTabAccess | null> {
  const tab = await getActiveBrowserTab()
  const pattern = originPatternForUrl(tab?.url)
  if (tab?.id == null || !tab.url || !pattern || classifyTabUrl(tab.url)) return null
  const access = { url: tab.url, host: new URL(tab.url).hostname }
  if (await chrome.permissions.contains({ origins: [pattern] })) return { ...access, granted: true }
  // activeTab grants never show up in permissions.contains, so try a no-op injection instead.
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => true })
    return { ...access, granted: true }
  } catch {
    return { ...access, granted: false }
  }
}

/** Whether page tools can reach the tab the user is looking at; null for pages Chrome never allows. */
export function useActiveTabAccess(): ActiveTabAccess | null {
  const [access, setAccess] = useState<ActiveTabAccess | null>(null)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void probeActiveTab()
          .then((next) => active && setAccess(next))
          .catch(() => active && setAccess(null))
      }, 120)
    }
    const onUpdated = (_tabId: number, info: { url?: string; status?: string }) => {
      if (info.url || info.status === 'complete') refresh()
    }

    refresh()
    chrome.tabs.onActivated.addListener(refresh)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.windows.onFocusChanged.addListener(refresh)
    const stop = onSiteAccessChanged(refresh)
    return () => {
      active = false
      clearTimeout(timer)
      chrome.tabs.onActivated.removeListener(refresh)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.windows.onFocusChanged.removeListener(refresh)
      stop()
    }
  }, [])

  return access
}
