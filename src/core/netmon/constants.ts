import type { NetIntervalSec, NetMonitorSettings, NetSoundId, NetStatus } from './types'

export const NETMON_LIVE_KEY = 'netMonitorLive'
export const NETMON_REALTIME_KEY = 'netMonitorRealtime'

export const NETMON_INTERVALS: NetIntervalSec[] = [1, 2, 3, 5]
export const REALTIME_WINDOW_MS = 24 * 60 * 60 * 1000
export const MAX_LOG_EVENTS = 20_000
export const PROBE_TIMEOUT_MS = 4000
export const IP_REFRESH_MS = 5 * 60 * 1000
export const IP_ENDPOINT = 'https://api.ipify.org?format=json'

export const PING_PRESETS: { url: string; label: string }[] = [
  { url: 'https://www.google.com/favicon.ico', label: 'Google' },
  { url: 'https://www.gstatic.com/generate_204', label: 'Google (204)' },
  { url: 'https://www.cloudflare.com/favicon.ico', label: 'Cloudflare' },
  { url: 'https://www.microsoft.com/favicon.ico', label: 'Microsoft' },
  { url: 'https://www.apple.com/favicon.ico', label: 'Apple' },
  { url: 'https://www.amazon.com/favicon.ico', label: 'Amazon' },
]

export const STATUS_META: Record<NetStatus, { human: string; system: string; short: string; color: string }> = {
  online: { human: 'Online', system: 'online', short: 'Online', color: 'var(--netmon-online)' },
  lan: {
    human: 'No Internet connection. Wi-Fi/LAN OK',
    system: 'lan_ok',
    short: 'Connection issues',
    color: 'var(--netmon-lan)',
  },
  offline: { human: 'No Internet connection', system: 'offline', short: 'Offline', color: 'var(--netmon-offline)' },
  nodata: { human: 'No data (monitor was off)', system: 'no_data', short: 'No data', color: 'var(--netmon-nodata)' },
}

export const SOUND_OPTIONS: { id: NetSoundId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'chime', label: 'Chime' },
  { id: 'rise', label: 'Rising' },
  { id: 'beep', label: 'Beep' },
  { id: 'pop', label: 'Pop' },
  { id: 'alert', label: 'Alert' },
  { id: 'fall', label: 'Falling' },
]

export const DEFAULT_NETMON_SETTINGS: NetMonitorSettings = {
  enabled: false,
  intervalSec: 3,
  pingUrl: PING_PRESETS[0].url,
  showIp: true,
  showHeaderIcon: true,
  soundOnline: 'none',
  soundOffline: 'none',
  volume: 0.6,
  toolbarIcon: 'off',
  log: { dateFormat: 'default', statusFormat: 'human', simplify: false, durationFormat: 'human' },
}

/** Gap between probes after which the monitor is treated as having been off (sleep, shutdown). */
export function noDataGapMs(intervalSec: number): number {
  return Math.max(15_000, intervalSec * 4000)
}

export function isDown(status: NetStatus): boolean {
  return status === 'offline' || status === 'lan'
}
