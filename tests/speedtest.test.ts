import { describe, expect, it, vi } from 'vitest'

import {
  finalMbps,
  formatPlace,
  gaugeFraction,
  jitter,
  lookupConnection,
  median,
  mergeServer,
  runSpeedTest,
  serverTimingMs,
  speedRating,
  toMbps,
  windowMbps,
  type SpeedUpdate,
} from '@/core/speedtest'

describe('speed test stats', () => {
  it('computes median and jitter', () => {
    expect(median([])).toBeNull()
    expect(median([30, 10, 20])).toBe(20)
    expect(median([10, 20, 30, 40])).toBe(25)
    expect(jitter([10])).toBeNull()
    expect(jitter([10, 14, 12])).toBe(3)
  })

  it('parses server-timing durations', () => {
    expect(serverTimingMs('cfRequestDuration;dur=12.5')).toBe(12.5)
    expect(serverTimingMs(null)).toBe(0)
    expect(serverTimingMs('cache;desc=hit')).toBe(0)
  })

  it('converts bytes over time to megabits per second', () => {
    expect(toMbps(1_250_000, 1000)).toBe(10)
    expect(toMbps(100, 0)).toBe(0)
  })

  it('uses a trailing window for live speed and skips warmup for the final result', () => {
    const points = [
      { t: 0, bytes: 0 },
      { t: 1000, bytes: 125_000 }, // 1 Mbps during ramp-up
      { t: 2000, bytes: 1_375_000 }, // 10 Mbps
      { t: 3000, bytes: 2_625_000 }, // 10 Mbps
    ]
    expect(windowMbps(points)).toBeCloseTo(10)
    expect(finalMbps(points, 1000)).toBeCloseTo(10)
    expect(finalMbps(points, 0)).toBeCloseTo(7)
    expect(finalMbps([{ t: 0, bytes: 0 }], 0)).toBeNull()
  })

  it('maps speeds onto evenly spaced gauge ticks', () => {
    expect(gaugeFraction(0)).toBe(0)
    expect(gaugeFraction(1)).toBeCloseTo(1 / 8)
    expect(gaugeFraction(100)).toBeCloseTo(5 / 8)
    expect(gaugeFraction(75)).toBeCloseTo(4.5 / 8)
    expect(gaugeFraction(5000)).toBe(1)
  })

  it('rates download speed', () => {
    expect(speedRating(null)).toBeNull()
    expect(speedRating(2)).toBe('slow')
    expect(speedRating(300)).toBe('great')
  })
})

class FakeXhr {
  static bytesPerTick = 250_000
  upload: { onprogress: ((e: { loaded: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  open() {}
  send() {
    let loaded = 0
    this.timer = setInterval(() => {
      loaded += FakeXhr.bytesPerTick
      this.upload.onprogress?.({ loaded })
    }, 50)
  }
  abort() {
    if (this.timer) clearInterval(this.timer)
    this.onabort?.()
  }
}

function streamResponse(chunks: number, chunkSize: number, signal?: AbortSignal | null) {
  let sent = 0
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (signal?.aborted || sent >= chunks) return controller.close()
      await new Promise((r) => setTimeout(r, 20))
      sent++
      controller.enqueue(new Uint8Array(chunkSize))
    },
  })
  return new Response(body)
}

describe('runSpeedTest', () => {
  it('measures ping without server time, then download and upload', async () => {
    let clock = 0
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('https://ipwho.is/')) {
        expect(url).toBe('https://ipwho.is/1.2.3.4')
        return Response.json({
          success: true,
          ip: '1.2.3.4',
          city: 'Pune',
          region: 'Maharashtra',
          country: 'India',
          connection: { asn: 132770, isp: 'Example ISP' },
        })
      }
      if (url.includes('bytes=0&')) {
        clock += 30
        return new Response('', {
          headers: {
            'server-timing': 'cfRequestDuration;dur=10',
            'cf-meta-ip': '1.2.3.4',
            colo: 'BOM',
            asn: '132770',
            city: 'Pune',
            country: 'IN',
          },
        })
      }
      return streamResponse(1000, 50_000, init?.signal)
    }) as unknown as typeof fetch

    const updates: SpeedUpdate[] = []
    const result = await runSpeedTest({
      fetchImpl,
      createXhr: () => new FakeXhr() as unknown as XMLHttpRequest,
      latencySamples: 4,
      downloadMs: 600,
      uploadMs: 600,
      warmupMs: 100,
      streams: 2,
      tickMs: 50,
      now: () => clock + performance.now(),
      onUpdate: (u) => updates.push(u),
    })

    expect(result.pingMs).toBeGreaterThanOrEqual(20)
    expect(result.pingMs).toBeLessThan(28)
    expect(result.server).toMatchObject({
      colo: 'BOM',
      ip: '1.2.3.4',
      isp: 'Example ISP',
      asn: 132770,
      clientCity: 'Pune',
      clientRegion: 'Maharashtra',
      clientCountry: 'India',
    })
    expect(result.downloadMbps).toBeGreaterThan(0)
    expect(result.uploadMbps).toBeGreaterThan(0)
    expect(result.downloadBytes).toBeGreaterThan(0)
    expect(updates.filter((u) => u.type === 'phase').map((u) => (u as { phase: string }).phase)).toEqual([
      'latency',
      'download',
      'upload',
      'done',
    ])
    expect(updates.some((u) => u.type === 'throughput' && u.phase === 'upload')).toBe(true)
  })

  it('rejects with AbortError when cancelled', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => {
      controller.abort()
      return Response.json({})
    }) as unknown as typeof fetch
    await expect(runSpeedTest({ fetchImpl, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('network info', () => {
  it('returns an empty result when the ISP lookup fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('offline')
    }) as unknown as typeof fetch
    await expect(lookupConnection('1.2.3.4', { fetchImpl })).resolves.toEqual({})
  })

  it('merges partial results without dropping known fields', () => {
    expect(mergeServer({ ip: '1.2.3.4', isp: 'A' }, { isp: undefined, colo: 'BOM' })).toEqual({
      ip: '1.2.3.4',
      isp: 'A',
      colo: 'BOM',
    })
  })

  it('formats place names without repeats', () => {
    expect(formatPlace({ city: 'Singapore', region: 'Singapore', country: 'Singapore' })).toBe('Singapore')
    expect(formatPlace({ city: 'Pune', country: 'India' })).toBe('Pune, India')
    expect(formatPlace(null)).toBe('')
  })
})
