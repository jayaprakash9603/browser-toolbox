import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import type { ExtensionMessage } from '@/core/messaging/types'
import {
  NETMON_LIVE_KEY,
  NETMON_REALTIME_KEY,
  REALTIME_WINDOW_MS,
  getNetEvents,
  getNetMonitorSettings,
  isDown,
  noDataGapMs,
  setNetEvents,
  type NetEvent,
  type NetLive,
  type NetMonitorSettings,
  type NetSample,
  type NetStatus,
} from '@/core/netmon'
import { get, set } from '@/core/storage'

import { ensureOffscreenDocument, keepOffscreenAlive } from '../offscreen'
import { showToolbarStatus } from './toolbarIcon'

const logger = createLogger('netmon')
const ALARM = 'netmon-keepalive'
const HEARTBEAT_EVERY_MS = 30_000
const REALTIME_PERSIST_EVERY_MS = 10_000

type Sample = Extract<ExtensionMessage, { type: 'NETMON_SAMPLE' }>

let settings: NetMonitorSettings | null = null
let samples: NetSample[] | null = null
let live: NetLive | null = null
let lastEventStatus: NetStatus | null | undefined
let lastSampleAt = 0
let heartbeatWrittenAt = 0
let realtimePersistedAt = 0
let queue: Promise<unknown> = Promise.resolve()

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task)
  queue = next.catch(() => undefined)
  return next
}

async function currentSettings(): Promise<NetMonitorSettings> {
  settings ??= await getNetMonitorSettings()
  return settings
}

async function loadState(): Promise<void> {
  if (samples) return
  const session = await chrome.storage.session.get([NETMON_LIVE_KEY, NETMON_REALTIME_KEY])
  live = (session[NETMON_LIVE_KEY] as NetLive | undefined) ?? null
  samples = (session[NETMON_REALTIME_KEY] as NetSample[] | undefined) ?? []
  const heartbeat = (await get<number>(STORAGE_KEYS.netMonitorHeartbeat)) ?? 0
  lastSampleAt = Math.max(lastSampleAt, heartbeat, live?.lastSampleAt ?? 0)
  lastEventStatus = (await getNetEvents()).at(-1)?.status ?? null
}

async function appendEvent(event: NetEvent): Promise<void> {
  const events = await getNetEvents()
  events.push(event)
  await setNetEvents(events)
  lastEventStatus = event.status
}

async function persistRealtime(force = false): Promise<void> {
  if (!samples) return
  const now = Date.now()
  if (!force && now - realtimePersistedAt < REALTIME_PERSIST_EVERY_MS) return
  realtimePersistedAt = now
  await chrome.storage.session.set({ [NETMON_REALTIME_KEY]: samples })
}

function soundFor(prev: NetStatus | null | undefined, next: NetStatus, s: NetMonitorSettings) {
  if (next === 'online' && prev && isDown(prev)) return s.soundOnline
  if (isDown(next) && prev === 'online') return s.soundOffline
  return 'none'
}

async function handleSample(message: Sample): Promise<void> {
  const s = await currentSettings()
  if (!s.enabled) return
  await loadState()
  const now = Date.now()

  // A long silence means the browser or computer was asleep/off; that time is excluded from stats.
  if (lastSampleAt && now - lastSampleAt > noDataGapMs(s.intervalSec)) {
    const gapStart = lastSampleAt + s.intervalSec * 1000
    if (lastEventStatus !== 'nodata') await appendEvent({ at: gapStart, status: 'nodata' })
    samples!.push({ at: gapStart, status: 'nodata', latency: null })
  }

  const changed = message.status !== lastEventStatus
  if (changed) {
    const sound = soundFor(lastEventStatus, message.status, s)
    await appendEvent({ at: now, status: message.status, ...(message.ip ? { ip: message.ip } : {}) })
    if (sound !== 'none') {
      void chrome.runtime
        .sendMessage({ type: 'NETMON_OFFSCREEN_SOUND', sound, volume: s.volume })
        .catch(() => {})
    }
  }

  live = {
    status: message.status,
    latency: message.latency,
    ip: message.ip ?? null,
    since: changed || !live || live.status !== message.status ? now : live.since,
    lastSampleAt: now,
    pingUrl: s.pingUrl,
  }
  lastSampleAt = now
  samples!.push({ at: now, status: message.status, latency: message.latency, ...(message.ip ? { ip: message.ip } : {}) })
  const cutoff = now - REALTIME_WINDOW_MS
  if (samples![0] && samples![0].at < cutoff) samples = samples!.filter((x) => x.at >= cutoff)

  await chrome.storage.session.set({ [NETMON_LIVE_KEY]: live })
  await persistRealtime(changed)
  if (now - heartbeatWrittenAt > HEARTBEAT_EVERY_MS) {
    heartbeatWrittenAt = now
    await set(STORAGE_KEYS.netMonitorHeartbeat, now)
  }
  await showToolbarStatus(s.toolbarIcon === 'dot' ? message.status : null)
}

function offscreenConfig(s: NetMonitorSettings): Extract<ExtensionMessage, { type: 'NETMON_OFFSCREEN_CONFIG' }> {
  return { type: 'NETMON_OFFSCREEN_CONFIG', enabled: s.enabled, intervalSec: s.intervalSec, pingUrl: s.pingUrl, showIp: s.showIp }
}

async function stopMonitoring(): Promise<void> {
  await loadState()
  if (lastEventStatus && lastEventStatus !== 'nodata') await appendEvent({ at: Date.now(), status: 'nodata' })
  live = null
  lastSampleAt = 0
  await chrome.storage.session.remove(NETMON_LIVE_KEY)
  await persistRealtime(true)
  await set(STORAGE_KEYS.netMonitorHeartbeat, 0)
  await showToolbarStatus(null)
}

/** Brings the probe loop in line with the stored settings; safe to call repeatedly. */
export function syncNetMonitor(): Promise<void> {
  return serialize(async () => {
    settings = await getNetMonitorSettings()
    const s = settings
    keepOffscreenAlive('netmon', s.enabled)
    if (s.enabled) {
      await chrome.alarms.create(ALARM, { periodInMinutes: 1 })
      await ensureOffscreenDocument()
      if (s.toolbarIcon !== 'dot') await showToolbarStatus(null)
      else if (live) await showToolbarStatus(live.status)
    } else {
      await chrome.alarms.clear(ALARM)
      await stopMonitoring()
    }
    await chrome.runtime.sendMessage(offscreenConfig(s)).catch(() => {})
  }).catch((error: unknown) => logger.warn('sync failed', error))
}

export function registerNetMonitor(): void {
  registerMessageHandler('NETMON_SAMPLE', (message) =>
    serialize(() => handleSample(message as Sample)).then(() => ({ recorded: true })),
  )
  registerMessageHandler('NETMON_OFFSCREEN_READY', async () => {
    const s = await currentSettings()
    return offscreenConfig(s)
  })
  registerMessageHandler('NETMON_GET_REALTIME', () =>
    serialize(async () => {
      await loadState()
      return { samples: samples ?? [], live }
    }),
  )
  registerMessageHandler('NETMON_RESET_REALTIME', () =>
    serialize(async () => {
      await loadState()
      samples = []
      await persistRealtime(true)
      return { reset: true }
    }),
  )

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && STORAGE_KEYS.netMonitor in changes) void syncNetMonitor()
    if (area === 'local' && STORAGE_KEYS.netMonitorLog in changes) {
      const next = changes[STORAGE_KEYS.netMonitorLog].newValue as NetEvent[] | undefined
      lastEventStatus = next?.at(-1)?.status ?? null
    }
  })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void syncNetMonitor()
  })
  void syncNetMonitor()
}
