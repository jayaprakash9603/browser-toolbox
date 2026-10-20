/** Online, "No Internet connection. Wi-Fi/LAN OK", offline, or monitor was off (sleep/shutdown). */
export type NetStatus = 'online' | 'lan' | 'offline' | 'nodata'

/** A status change in the connection log. The status lasts until the next event. */
export interface NetEvent {
  at: number
  status: NetStatus
  ip?: string
}

/** One connectivity probe, kept for the realtime monitor. */
export interface NetSample {
  at: number
  status: NetStatus
  latency: number | null
  ip?: string
}

export interface NetLive {
  status: NetStatus
  latency: number | null
  ip: string | null
  since: number
  lastSampleAt: number
  pingUrl: string
}

export type NetIntervalSec = 1 | 2 | 3 | 5
export type NetSoundId = 'none' | 'chime' | 'rise' | 'beep' | 'pop' | 'alert' | 'fall'
export type NetToolbarIcon = 'off' | 'dot'
export type NetDateFormat = 'default' | 'us' | 'eu' | 'iso'

export interface NetLogOptions {
  dateFormat: NetDateFormat
  statusFormat: 'human' | 'system'
  /** Omit "Wi-Fi/LAN OK" (counted as offline) and "No data" rows. */
  simplify: boolean
  durationFormat: 'human' | 'seconds'
}

export interface NetMonitorSettings {
  enabled: boolean
  intervalSec: NetIntervalSec
  pingUrl: string
  showIp: boolean
  showHeaderIcon: boolean
  soundOnline: NetSoundId
  soundOffline: NetSoundId
  volume: number
  toolbarIcon: NetToolbarIcon
  log: NetLogOptions
}

export interface NetMonitorBackup {
  app: 'browser-toolbox.internet-monitor'
  version: 1
  exportedAt: string
  settings: NetMonitorSettings
  events: NetEvent[]
}

export interface WindowStats {
  disconnects: number
  /** Share of monitored time spent online (0..1); null when nothing was monitored. */
  availability: number | null
  downtimeMs: number
  onlineMs: number
}

export interface BucketStats extends WindowStats {
  key: string
  label: string
}
