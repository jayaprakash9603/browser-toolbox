import { useCallback, useEffect, useState } from 'react'

import { buildSeoReport, fetchSeoNetworkContext, type SeoReport } from '@/core/engines/seo'
import { loadSeoPageData, pageLoadErrorKey, type PageLoadErrorCode } from '../pageDataClient'

export function useSeoReport() {
  const [report, setReport] = useState<SeoReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [tabId, setTabId] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setErrorKey(null)
    const pageResult = await loadSeoPageData()
    if (!pageResult.ok) {
      setReport(null)
      setErrorKey(pageLoadErrorKey(pageResult.code))
      setTabId(null)
      setLoading(false)
      return
    }
    setTabId(pageResult.tabId)
    const network = await fetchSeoNetworkContext(pageResult.data.url)
    setReport(buildSeoReport(pageResult.data, network))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { report, loading, errorKey, refresh, tabId }
}

export type { PageLoadErrorCode }
