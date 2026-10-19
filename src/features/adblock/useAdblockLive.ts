import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  emptyTotals,
  getAdblockTabStats,
  getAdblockTotals,
  TAB_STATS_SESSION_KEY,
  type AdblockTabEntry,
  type AdblockTabStatsMap,
  type AdblockTotals,
} from '@/core/adblock'
import { STORAGE_KEYS } from '@/core/constants'

export interface ActiveTabInfo {
  id: number
  url: string
  title: string
  favIconUrl?: string
}

async function queryActiveTab(): Promise<ActiveTabInfo | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id == null) return null
    return { id: tab.id, url: tab.url ?? '', title: tab.title ?? '', favIconUrl: tab.favIconUrl }
  } catch {
    return null
  }
}

/** Live per-tab and lifetime blocking counters, refreshed from storage change events. */
export function useAdblockLive() {
  const [tabMap, setTabMap] = useState<AdblockTabStatsMap>({})
  const [totals, setTotals] = useState<AdblockTotals>(() => emptyTotals())
  const [activeTab, setActiveTab] = useState<ActiveTabInfo | null>(null)

  const refreshActiveTab = useCallback(() => {
    void queryActiveTab().then(setActiveTab)
  }, [])

  useEffect(() => {
    void getAdblockTabStats().then(setTabMap)
    void getAdblockTotals().then(setTotals)
    void queryActiveTab().then(setActiveTab)

    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const tabChange = changes[TAB_STATS_SESSION_KEY]
      if (tabChange && (area === 'session' || area === 'local')) {
        setTabMap((tabChange.newValue as AdblockTabStatsMap | undefined) ?? {})
      }
      const totalsChange = changes[STORAGE_KEYS.adblockTotals]
      if (area === 'local' && totalsChange) {
        setTotals((totalsChange.newValue as AdblockTotals | undefined) ?? emptyTotals())
      }
    }
    const onActivated = () => void queryActiveTab().then(setActiveTab)
    const onUpdated = (_id: number, info: { url?: string; title?: string; status?: string }) => {
      if (info.url || info.title || info.status === 'complete') onActivated()
    }

    chrome.storage.onChanged.addListener(onStorage)
    chrome.tabs.onActivated?.addListener(onActivated)
    chrome.tabs.onUpdated?.addListener(onUpdated)
    return () => {
      chrome.storage.onChanged.removeListener(onStorage)
      chrome.tabs.onActivated?.removeListener(onActivated)
      chrome.tabs.onUpdated?.removeListener(onUpdated)
    }
  }, [])

  const activeEntry: AdblockTabEntry | null = activeTab ? (tabMap[String(activeTab.id)] ?? null) : null

  const liveTabs = useMemo(
    () =>
      Object.values(tabMap)
        .filter((entry) => entry.network + entry.hidden + entry.youtube > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [tabMap],
  )

  return { tabMap, liveTabs, totals, activeTab, activeEntry, refreshActiveTab }
}
