import { useCallback, useEffect, useState } from 'react'

import { STORAGE_KEYS } from '@/core/constants'
import { sendMessage } from '@/core/messaging'
import {
  NETMON_LIVE_KEY,
  REALTIME_WINDOW_MS,
  getNetEvents,
  getNetMonitorSettings,
  normalizeNetSettings,
  updateNetMonitorSettings,
  type NetEvent,
  type NetLive,
  type NetMonitorSettings,
  type NetMonitorSettingsPatch,
  type NetSample,
} from '@/core/netmon'

type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void

function useStorageListener(listener: StorageListener) {
  useEffect(() => {
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [listener])
}

export function useNetMonitorSettings() {
  const [settings, setSettings] = useState<NetMonitorSettings | null>(null)

  useEffect(() => {
    void getNetMonitorSettings().then(setSettings)
  }, [])

  useStorageListener(
    useCallback((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.netMonitor]) {
        setSettings(normalizeNetSettings(changes[STORAGE_KEYS.netMonitor].newValue as Partial<NetMonitorSettings>))
      }
    }, []),
  )

  const patch = useCallback(async (next: NetMonitorSettingsPatch) => {
    setSettings(await updateNetMonitorSettings(next))
  }, [])

  return { settings, patch }
}

export function useNetLive(): NetLive | null {
  const [live, setLive] = useState<NetLive | null>(null)

  useEffect(() => {
    void chrome.storage.session.get(NETMON_LIVE_KEY).then((r) => setLive((r[NETMON_LIVE_KEY] as NetLive) ?? null))
  }, [])

  useStorageListener(
    useCallback((changes, area) => {
      if (area === 'session' && NETMON_LIVE_KEY in changes) {
        setLive((changes[NETMON_LIVE_KEY].newValue as NetLive | undefined) ?? null)
      }
    }, []),
  )

  return live
}

export function useNetEvents(): NetEvent[] {
  const [events, setEvents] = useState<NetEvent[]>([])

  useEffect(() => {
    void getNetEvents().then(setEvents)
  }, [])

  useStorageListener(
    useCallback((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.netMonitorLog]) {
        setEvents((changes[STORAGE_KEYS.netMonitorLog].newValue as NetEvent[] | undefined) ?? [])
      }
    }, []),
  )

  return events
}

/** Seeds from the background's 24 h buffer, then follows live samples as they arrive. */
export function useNetRealtime(live: NetLive | null) {
  const [samples, setSamples] = useState<NetSample[]>([])

  useEffect(() => {
    void sendMessage<{ samples: NetSample[] }>({ type: 'NETMON_GET_REALTIME' }).then((r) => {
      if (r) setSamples(r.samples)
    })
  }, [])

  const [seen, setSeen] = useState<number>(0)
  if (live && live.lastSampleAt !== seen) {
    setSeen(live.lastSampleAt)
    setSamples((prev) => {
      if (prev.at(-1)?.at === live.lastSampleAt) return prev
      const cutoff = live.lastSampleAt - REALTIME_WINDOW_MS
      const sample: NetSample = {
        at: live.lastSampleAt,
        status: live.status,
        latency: live.latency,
        ...(live.ip ? { ip: live.ip } : {}),
      }
      return [...prev.filter((s) => s.at >= cutoff), sample]
    })
  }

  const reset = useCallback(async () => {
    await sendMessage({ type: 'NETMON_RESET_REALTIME' })
    setSamples([])
  }, [])

  return { samples, reset }
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
