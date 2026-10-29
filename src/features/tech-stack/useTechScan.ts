import { useEffect, useState } from 'react'

import type { TechScan } from '@/core/engines/techStack/types'
import { onSiteAccessChanged } from '@/core/permissions/siteAccess'
import { pageLoadErrorKey } from '@/tools/seo/pageDataClient'

import { scanActiveTabTech } from './scanClient'

export type TechScanState =
  | { status: 'loading'; scan: TechScan | null }
  | { status: 'ready'; scan: TechScan }
  | { status: 'error'; scan: TechScan | null; errorKey: string }

interface Settled {
  round: number
  scan: TechScan | null
  errorKey: string | null
}

/** Scans the active tab, keeping the previous result on screen while a newer scan runs. */
export function useTechScan(): { state: TechScanState; rescan: () => void } {
  const [round, setRound] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    let live = true
    void scanActiveTabTech().then((result) => {
      if (!live) return
      setSettled((previous) =>
        result.ok
          ? { round, scan: result.data, errorKey: null }
          : { round, scan: previous?.scan ?? null, errorKey: pageLoadErrorKey(result.code) },
      )
    })
    return () => {
      live = false
    }
  }, [round])

  useEffect(() => {
    const rescan = () => setRound((current) => current + 1)
    const onTabUpdated = (_tabId: number, info: { status?: string }, tab: chrome.tabs.Tab) => {
      if (info.status === 'complete' && tab.active) rescan()
    }
    chrome.tabs.onActivated.addListener(rescan)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    const stopWatchingAccess = onSiteAccessChanged(rescan)
    return () => {
      chrome.tabs.onActivated.removeListener(rescan)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      stopWatchingAccess()
    }
  }, [])

  const scan = settled?.scan ?? null
  let state: TechScanState = { status: 'loading', scan }
  if (settled?.round === round) {
    state = settled.errorKey
      ? { status: 'error', scan, errorKey: settled.errorKey }
      : { status: 'ready', scan: settled.scan! }
  }

  return { state, rescan: () => setRound((current) => current + 1) }
}
