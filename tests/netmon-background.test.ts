import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/core/constants'
import type { ExtensionMessage } from '@/core/messaging/types'
import { NETMON_LIVE_KEY, type NetEvent, type NetLive } from '@/core/netmon'

import { resetChromeMockStorage } from './setup'

type Handler = (message: ExtensionMessage) => Promise<unknown> | unknown
const handlers = new Map<string, Handler>()

vi.mock('@/core/messaging', () => ({
  registerMessageHandler: (type: string, handler: Handler) => handlers.set(type, handler),
}))

const T0 = new Date(2026, 9, 20, 12, 0, 0).getTime()
let clock = T0

const extra = {
  alarms: {
    create: vi.fn(async () => undefined),
    clear: vi.fn(async () => true),
    onAlarm: { addListener: vi.fn() },
  },
  offscreen: {
    createDocument: vi.fn(async () => undefined),
    closeDocument: vi.fn(async () => undefined),
    Reason: { BLOBS: 'BLOBS' },
  },
}

async function setup(settings: Record<string, unknown>) {
  await chrome.storage.local.set({ [STORAGE_KEYS.netMonitor]: settings })
  vi.resetModules()
  handlers.clear()
  const mod = await import('@/chrome/background/netmon')
  mod.registerNetMonitor()
  await mod.syncNetMonitor()
  return mod
}

const sample = (status: 'online' | 'offline' | 'lan', ip?: string) =>
  handlers.get('NETMON_SAMPLE')!({ type: 'NETMON_SAMPLE', status, latency: status === 'online' ? 20 : null, ip })

async function events(): Promise<NetEvent[]> {
  return ((await chrome.storage.local.get(STORAGE_KEYS.netMonitorLog)) as Record<string, NetEvent[]>)[
    STORAGE_KEYS.netMonitorLog
  ]
}

const sentSounds = () =>
  vi
    .mocked(chrome.runtime.sendMessage)
    .mock.calls.map(([m]) => m as unknown as ExtensionMessage)
    .filter((m) => m.type === 'NETMON_OFFSCREEN_SOUND')

describe('internet monitor background', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
    clock = T0
    vi.spyOn(Date, 'now').mockImplementation(() => clock)
    Object.assign(chrome, extra)
    Object.assign(chrome.runtime, {
      getContexts: vi.fn(async () => []),
      getManifest: () => ({ icons: { 16: 'icons/icon16.png' } }),
      ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
    })
    Object.assign(chrome.action, { setIcon: vi.fn(async () => undefined) })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates the offscreen document and sends the probe config when enabled', async () => {
    await setup({ enabled: true, intervalSec: 2 })
    expect(chrome.offscreen.createDocument).toHaveBeenCalled()
    expect(chrome.alarms.create).toHaveBeenCalledWith('netmon-keepalive', { periodInMinutes: 1 })
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NETMON_OFFSCREEN_CONFIG', enabled: true, intervalSec: 2 }),
    )
  })

  it('logs status changes only, keeps live state and plays transition sounds', async () => {
    await setup({ enabled: true, intervalSec: 3, soundOnline: 'chime', soundOffline: 'alert', volume: 0.5 })

    await sample('online', '1.2.3.4')
    clock += 3000
    await sample('online', '1.2.3.4')
    clock += 3000
    await sample('offline')
    clock += 3000
    await sample('lan')
    clock += 3000
    await sample('online', '1.2.3.4')

    expect((await events()).map((e) => e.status)).toEqual(['online', 'offline', 'lan', 'online'])
    expect((await events())[0].ip).toBe('1.2.3.4')
    expect(sentSounds().map((m) => (m as { sound: string }).sound)).toEqual(['alert', 'chime'])

    const live = (await chrome.storage.session.get(NETMON_LIVE_KEY))[NETMON_LIVE_KEY] as NetLive
    expect(live).toMatchObject({ status: 'online', ip: '1.2.3.4', since: clock, lastSampleAt: clock })

    const realtime = (await handlers.get('NETMON_GET_REALTIME')!({ type: 'NETMON_GET_REALTIME' })) as {
      samples: unknown[]
    }
    expect(realtime.samples).toHaveLength(5)
  })

  it('records a "No data" gap when samples stop for a while (sleep, browser closed)', async () => {
    await setup({ enabled: true, intervalSec: 3 })
    await sample('online')
    clock += 10 * 60_000
    await sample('online')

    const log = await events()
    expect(log.map((e) => e.status)).toEqual(['online', 'nodata', 'online'])
    expect(log[1].at).toBe(T0 + 3000)
    expect(log[2].at).toBe(clock)
  })

  it('closes the log with "No data" and clears live state when turned off', async () => {
    const mod = await setup({ enabled: true, intervalSec: 3 })
    await sample('online')
    clock += 3000
    await chrome.storage.local.set({ [STORAGE_KEYS.netMonitor]: { enabled: false } })
    await mod.syncNetMonitor()

    expect((await events()).map((e) => e.status)).toEqual(['online', 'nodata'])
    expect((await chrome.storage.session.get(NETMON_LIVE_KEY))[NETMON_LIVE_KEY]).toBeUndefined()
    expect(chrome.alarms.clear).toHaveBeenCalledWith('netmon-keepalive')
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NETMON_OFFSCREEN_CONFIG', enabled: false }),
    )

    clock += 3000
    await sample('online')
    expect((await events()).map((e) => e.status)).toEqual(['online', 'nodata'])
  })

  it('keeps the shared offscreen document open while the monitor needs it', async () => {
    await setup({ enabled: true })
    const { releaseOffscreenDocument } = await import('@/chrome/background/offscreen')
    Object.assign(chrome.runtime, { getContexts: vi.fn(async () => [{}]) })
    await releaseOffscreenDocument()
    expect(chrome.offscreen.closeDocument).not.toHaveBeenCalled()
  })
})
