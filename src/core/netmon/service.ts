import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { DEFAULT_NETMON_SETTINGS, LATENCY_WARN_MS, MAX_LOG_EVENTS, NETMON_INTERVALS } from './constants'
import type { NetEvent, NetLogOptions, NetMonitorSettings } from './types'

export type NetMonitorSettingsPatch = Partial<Omit<NetMonitorSettings, 'log'>> & { log?: Partial<NetLogOptions> }

export function normalizeNetSettings(stored: Partial<NetMonitorSettings> | null | undefined): NetMonitorSettings {
  const merged: NetMonitorSettings = {
    ...DEFAULT_NETMON_SETTINGS,
    ...stored,
    log: { ...DEFAULT_NETMON_SETTINGS.log, ...stored?.log },
  }
  if (!NETMON_INTERVALS.includes(merged.intervalSec)) merged.intervalSec = DEFAULT_NETMON_SETTINGS.intervalSec
  if (!LATENCY_WARN_MS.includes(merged.latencyWarnMs)) merged.latencyWarnMs = DEFAULT_NETMON_SETTINGS.latencyWarnMs
  if (!/^https?:\/\//i.test(merged.pingUrl)) merged.pingUrl = DEFAULT_NETMON_SETTINGS.pingUrl
  merged.volume = Math.min(1, Math.max(0, Number(merged.volume) || 0))
  return merged
}

export async function getNetMonitorSettings(): Promise<NetMonitorSettings> {
  return normalizeNetSettings(await get<Partial<NetMonitorSettings>>(STORAGE_KEYS.netMonitor))
}

export async function updateNetMonitorSettings(patch: NetMonitorSettingsPatch): Promise<NetMonitorSettings> {
  const current = await getNetMonitorSettings()
  const next = normalizeNetSettings({ ...current, ...patch, log: { ...current.log, ...patch.log } })
  await set(STORAGE_KEYS.netMonitor, next)
  return next
}

export async function getNetEvents(): Promise<NetEvent[]> {
  return (await get<NetEvent[]>(STORAGE_KEYS.netMonitorLog)) ?? []
}

export async function setNetEvents(events: NetEvent[]): Promise<void> {
  await set(STORAGE_KEYS.netMonitorLog, events.slice(-MAX_LOG_EVENTS))
}

export async function clearNetLog(): Promise<void> {
  await set(STORAGE_KEYS.netMonitorLog, [])
}
