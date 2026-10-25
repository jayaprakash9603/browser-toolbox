import { useEffect, useState } from 'react'

import { getTabScriptRuns, scriptRunsKey, type TabScriptRuns } from '@/core/script-studio/runs'

const EMPTY: TabScriptRuns = {}

/** Live per-script execution results for one tab, reset by the background whenever the tab navigates. */
export function useTabScriptRuns(tabId: number | null): TabScriptRuns {
  const [state, setState] = useState<{ tabId: number; runs: TabScriptRuns } | null>(null)

  useEffect(() => {
    if (tabId == null || !chrome.storage?.session) return
    const key = scriptRunsKey(tabId)
    let cancelled = false
    void getTabScriptRuns(tabId).then((runs) => {
      if (!cancelled) setState({ tabId, runs })
    })
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'session' || !(key in changes)) return
      const next = changes[key].newValue
      setState({ tabId, runs: next && typeof next === 'object' ? (next as TabScriptRuns) : {} })
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      cancelled = true
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [tabId])

  return state && state.tabId === tabId ? state.runs : EMPTY
}
