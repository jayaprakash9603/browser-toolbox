import { useCallback, useEffect, useMemo, useState } from 'react'

import { getAdblockState, getAdblockTabStats, updateAdblockState, type AdblockState, type AdblockTabEntry } from '@/core/adblock'
import { getActiveWebTab } from '@/chrome/contentScriptClient'
import { STORAGE_KEYS } from '@/core/constants'
import { sendMessage } from '@/core/messaging'
import {
  getProtectionState,
  getProtectionStats,
  updateProtectionState,
  type ProtectionState,
  type ProtectionStats,
} from '@/core/protection'
import {
  SECURITY_NETLOG_PORT,
  getSecurityCenterSettings,
  getSecurityEvents,
  tabContextFromUrl,
  updateSecurityCenterSettings,
  type NetworkRequestRecord,
  type PauseSnapshot,
  type SecurityCenterSettings,
  type SecurityEvent,
  type SecurityScanReport,
  type TabSecurityContext,
} from '@/core/security-center'

import { runSiteScanBundle, type SiteScanBundle } from './runScan'
import { syncDetectedPosture } from './actions'

export function useActiveTabContext() {
  const [context, setContext] = useState<TabSecurityContext>(() => tabContextFromUrl(undefined))
  const refresh = useCallback(() => {
    void getActiveWebTab().then((tab) => setContext(tabContextFromUrl(tab?.url, tab?.id)))
  }, [])
  useEffect(() => {
    refresh()
    const onActivated = () => refresh()
    const onUpdated = (_id: number, info: { url?: string; status?: string }) => {
      if (info.url || info.status === 'complete') refresh()
    }
    chrome.tabs.onActivated?.addListener(onActivated)
    chrome.tabs.onUpdated?.addListener(onUpdated)
    return () => {
      chrome.tabs.onActivated?.removeListener(onActivated)
      chrome.tabs.onUpdated?.removeListener(onUpdated)
    }
  }, [refresh])
  return { context, refresh }
}

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecurityCenterSettings | null>(null)
  useEffect(() => {
    void getSecurityCenterSettings().then(setSettings)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.securityCenterSettings) {
        setSettings(changes.securityCenterSettings.newValue as SecurityCenterSettings)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])
  const patch = useCallback(async (next: Partial<SecurityCenterSettings>) => {
    const updated = await updateSecurityCenterSettings(next)
    setSettings(updated)
    void sendMessage({ type: 'SECURITY_SYNC_RULES' })
    void syncDetectedPosture()
    return updated
  }, [])
  return { settings, patch }
}

export function useProtectionEngine() {
  const [state, setState] = useState<ProtectionState | null>(null)
  const [stats, setStats] = useState<ProtectionStats | null>(null)
  const refresh = useCallback(() => {
    void getProtectionState().then(setState)
    void getProtectionStats().then(setStats)
  }, [])
  useEffect(() => {
    refresh()
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.protection]) {
        setState(changes[STORAGE_KEYS.protection].newValue as ProtectionState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh])
  const patch = useCallback(async (next: Partial<ProtectionState>) => {
    const updated = await updateProtectionState(next)
    setState(updated)
    void syncDetectedPosture()
    return updated
  }, [])
  return { state, stats, patch, refresh }
}

export function useAdblockEngine() {
  const [state, setState] = useState<AdblockState | null>(null)
  const [tabEntry, setTabEntry] = useState<AdblockTabEntry | null>(null)
  const refresh = useCallback(() => {
    void getAdblockState().then(setState)
    void getAdblockTabStats().then((map) => {
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.id != null) setTabEntry(map[String(tab.id)] ?? null)
      })
    })
  }, [])
  useEffect(() => {
    refresh()
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.adblock]) {
        setState(changes[STORAGE_KEYS.adblock].newValue as AdblockState)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh])
  const patch = useCallback(async (next: Partial<AdblockState>) => {
    const updated = await updateAdblockState(next)
    setState(updated)
    void syncDetectedPosture()
    return updated
  }, [])
  return { state, tabEntry, patch, refresh }
}

export function useSecurityEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const refresh = useCallback(() => {
    void getSecurityEvents().then(setEvents)
  }, [])
  useEffect(() => {
    refresh()
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.securityCenterEvents) {
        setEvents((changes.securityCenterEvents.newValue as SecurityEvent[]) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh])
  return { events, refresh }
}

export function useSecurityNetworkLog(tabId?: number) {
  const [entries, setEntries] = useState<NetworkRequestRecord[]>([])
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    let port: chrome.runtime.Port | undefined
    const pending: NetworkRequestRecord[] = []
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      timer = null
      if (!pending.length) return
      const batch = pending.splice(0, pending.length)
      setEntries((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]))
        for (const item of batch) map.set(item.id, item)
        return [...map.values()].slice(-800)
      })
    }
    try {
      port = chrome.runtime.connect({ name: SECURITY_NETLOG_PORT })
      port.onMessage.addListener((msg: { type: string; entry: NetworkRequestRecord }) => {
        if (msg.type !== 'entry') return
        if (tabId != null && msg.entry.tabId !== tabId) return
        pending.push(msg.entry)
        if (!timer) timer = setTimeout(flush, 250)
      })
    } catch {
      /* tests / no SW */
    }
    void sendMessage<NetworkRequestRecord[]>({ type: 'SECURITY_GET_NETWORK_LOG', tabId }).then((data) => {
      if (Array.isArray(data)) setEntries(data)
    })
    return () => {
      if (timer) clearTimeout(timer)
      port?.disconnect()
    }
  }, [tabId])

  const clear = useCallback(() => {
    void sendMessage({ type: 'SECURITY_CLEAR_NETWORK_LOG', tabId })
    setEntries([])
  }, [tabId])

  const setCapturePaused = useCallback((next: boolean) => {
    setPaused(next)
    void sendMessage({ type: 'SECURITY_SET_CAPTURE', paused: next })
  }, [])

  return { entries, clear, paused, setCapturePaused }
}

export function usePauseState() {
  const [pause, setPause] = useState<PauseSnapshot | null>(null)
  const refresh = useCallback(() => {
    void sendMessage<PauseSnapshot | null>({ type: 'SECURITY_GET_PAUSE' }).then((data) => setPause(data ?? null))
  }, [])
  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => window.clearInterval(timer)
  }, [refresh])
  const pauseAll = useCallback(async () => {
    const next = await sendMessage<PauseSnapshot>({ type: 'SECURITY_PAUSE_PROTECTION' })
    setPause(next ?? null)
  }, [])
  const resume = useCallback(async () => {
    await sendMessage({ type: 'SECURITY_RESUME_PROTECTION' })
    setPause(null)
  }, [])
  return { pause, pauseAll, resume, refresh }
}

export function useOverviewScan() {
  const [report, setReport] = useState<SecurityScanReport | null>(null)
  const [bundle, setBundle] = useState<SiteScanBundle | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const next = await runSiteScanBundle()
      setBundle(next)
      setReport(next.report)
      return next.report
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Scan failed.')
      return null
    } finally {
      setScanning(false)
    }
  }, [])
  return { report, bundle, scanning, error, scan, setReport }
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const delta = Math.max(0, now - timestamp)
  if (delta < 15_000) return 'just now'
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`
  return new Date(timestamp).toLocaleString()
}

export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useMemoFilter<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return useMemo(() => items.filter(predicate), [items, predicate])
}
