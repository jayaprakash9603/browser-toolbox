import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { buildA11yReport, type A11yPageScan, type A11yReport } from '@/core/engines/a11y'
import { pageLoadErrorKey } from '@/tools/seo/pageDataClient'

import { scanActiveTab } from './client'
import { recordScore, type A11yToolkitPrefs } from './prefs'

export type AuditStatus = 'idle' | 'scanning' | 'ready' | 'error'

interface AuditState {
  status: AuditStatus
  scan: A11yPageScan | null
  tabId: number | null
  errorKey: string | null
  scannedAt: number | null
  previousScore: number | null
}

const INITIAL: AuditState = {
  status: 'idle',
  scan: null,
  tabId: null,
  errorKey: null,
  scannedAt: null,
  previousScore: null,
}

const RESCAN_DELAY_MS = 700

export function useA11yAudit(prefs: A11yToolkitPrefs, ready: boolean) {
  const [state, setState] = useState<AuditState>(INITIAL)
  const runId = useRef(0)
  const { includeAAA, includeNotices, contrast, maxNodes, autoRescan } = prefs

  const report: A11yReport | null = useMemo(
    () => (state.scan ? buildA11yReport(state.scan, { includeAAA, includeNotices }) : null),
    [state.scan, includeAAA, includeNotices],
  )

  const scan = useCallback(async () => {
    const id = ++runId.current
    setState((prev) => ({ ...prev, status: 'scanning', errorKey: null }))
    const result = await scanActiveTab({ maxNodes, contrast })
    if (id !== runId.current) return
    if (!result.ok) {
      setState({ ...INITIAL, status: 'error', errorKey: pageLoadErrorKey(result.code) })
      return
    }
    const score = buildA11yReport(result.data, { includeAAA, includeNotices }).score
    const previous = await recordScore(result.data.url || result.tabUrl, score)
    if (id !== runId.current) return
    setState({
      status: 'ready',
      scan: result.data,
      tabId: result.tabId,
      errorKey: null,
      scannedAt: Date.now(),
      previousScore: previous?.score ?? null,
    })
  }, [maxNodes, contrast, includeAAA, includeNotices])

  const scanRef = useRef(scan)
  useEffect(() => {
    scanRef.current = scan
  }, [scan])

  // Scan once prefs are loaded, and again whenever the scan inputs change.
  useEffect(() => {
    if (!ready) return
    void scanRef.current()
  }, [ready, maxNodes, contrast])

  useEffect(() => {
    if (!ready || !autoRescan) return
    const tabs = chrome.tabs
    if (!tabs?.onUpdated || !tabs.onActivated) return
    let timer: number | undefined
    const queue = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void scanRef.current(), RESCAN_DELAY_MS)
    }
    const onUpdated = (_tabId: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      if (tab.active && info.status === 'complete') queue()
    }
    const onActivated = () => queue()
    tabs.onUpdated.addListener(onUpdated)
    tabs.onActivated.addListener(onActivated)
    return () => {
      window.clearTimeout(timer)
      tabs.onUpdated.removeListener(onUpdated)
      tabs.onActivated.removeListener(onActivated)
    }
  }, [ready, autoRescan])

  return { ...state, report, scan }
}
