import { useEffect, useMemo, useState } from 'react'

import { fromNetLog } from '@/features/interceptor/networkModel'
import { useInterceptorLog } from '@/features/interceptor/hooks'

import { NetworkInspector } from './NetworkInspector'

interface Props {
  tabId?: number
}

/** Side-panel network log for the active tab (webRequest feed from the background). */
export function NetworkTab({ tabId }: Props) {
  const [activeTabId, setActiveTabId] = useState<number | undefined>(tabId)
  const [preserve, setPreserve] = useState(true)

  useEffect(() => {
    if (tabId != null) {
      setActiveTabId(tabId)
      return
    }
    const refresh = () =>
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id != null) setActiveTabId(tab.id)
      })
    refresh()
    chrome.tabs.onActivated.addListener(refresh)
    return () => chrome.tabs.onActivated.removeListener(refresh)
  }, [tabId])

  const { entries, clear } = useInterceptorLog(activeTabId)
  const rows = useMemo(() => entries.map(fromNetLog), [entries])

  return (
    <div className="relative h-[560px] overflow-hidden rounded-lg border">
      <NetworkInspector
        rows={rows}
        onClear={clear}
        preserveLog={preserve}
        onPreserveLogChange={setPreserve}
      />
    </div>
  )
}
