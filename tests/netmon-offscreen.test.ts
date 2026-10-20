import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExtensionMessage } from '@/core/messaging/types'

type Listener = (message: unknown, sender: unknown, respond: (r: unknown) => void) => boolean
let listener: Listener | null = null
let online = true
let pingOk = true

const samples = () =>
  vi
    .mocked(chrome.runtime.sendMessage)
    .mock.calls.map(([m]) => m as unknown as ExtensionMessage)
    .filter((m): m is Extract<ExtensionMessage, { type: 'NETMON_SAMPLE' }> => m.type === 'NETMON_SAMPLE')

describe('internet monitor probe loop', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    online = true
    pingOk = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('ipify')) return { json: async () => ({ ip: '198.51.100.7' }) } as Response
      if (!pingOk) throw new TypeError('Failed to fetch')
      return {} as Response
    })
    Object.assign(chrome.runtime.onMessage, {
      addListener: (fn: Listener) => {
        listener = fn
      },
    })
    vi.resetModules()
    await import('@/chrome/offscreen/netmon')
    listener!(
      { type: 'NETMON_OFFSCREEN_CONFIG', enabled: true, intervalSec: 1, pingUrl: 'https://ping.test/x', showIp: true },
      {},
      () => undefined,
    )
    await vi.advanceTimersByTimeAsync(10)
  })

  afterEach(() => {
    listener!(
      { type: 'NETMON_OFFSCREEN_CONFIG', enabled: false, intervalSec: 1, pingUrl: 'https://ping.test/x', showIp: true },
      {},
      () => undefined,
    )
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('reports online with latency and the public IP, bypassing the cache', async () => {
    expect(samples()[0]).toMatchObject({ status: 'online', ip: '198.51.100.7' })
    expect(samples()[0].latency).not.toBeNull()
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/^https:\/\/ping\.test\/x\?_tbx=/)
    expect(init).toMatchObject({ mode: 'no-cors', cache: 'no-store', credentials: 'omit' })
  })

  it('needs two failed probes before reporting Wi-Fi/LAN only', async () => {
    pingOk = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(samples().at(-1)!.status).toBe('online')
    await vi.advanceTimersByTimeAsync(1000)
    expect(samples().at(-1)).toMatchObject({ status: 'lan', latency: null, ip: undefined })
  })

  it('reports offline immediately when the network adapter is down', async () => {
    online = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(samples().at(-1)!.status).toBe('offline')
  })

  it('keeps reporting when the public IP lookup hangs', async () => {
    vi.mocked(fetch).mockImplementation(
      (url, init) =>
        new Promise((resolve, reject) => {
          if (!String(url).includes('ipify')) return resolve({} as Response)
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    listener!(
      { type: 'NETMON_OFFSCREEN_CONFIG', enabled: true, intervalSec: 2, pingUrl: 'https://ping.test/y', showIp: true },
      {},
      () => undefined,
    )
    await vi.advanceTimersByTimeAsync(15_000)
    expect(samples().filter((s) => s.status === 'online').length).toBeGreaterThan(1)
  })

  it('stops probing when disabled', async () => {
    listener!(
      { type: 'NETMON_OFFSCREEN_CONFIG', enabled: false, intervalSec: 1, pingUrl: 'https://ping.test/x', showIp: true },
      {},
      () => undefined,
    )
    const count = samples().length
    await vi.advanceTimersByTimeAsync(5000)
    expect(samples()).toHaveLength(count)
  })
})
