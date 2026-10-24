import { lookupConnection, mergeServer } from './network'
import { finalMbps, jitter, median, serverTimingMs, windowMbps } from './stats'
import type { SpeedServer, SpeedTestResult, SpeedUpdate, ThroughputPoint } from './types'

export const SPEEDTEST_BASE = 'https://speed.cloudflare.com'

export interface SpeedTestOptions {
  signal?: AbortSignal
  onUpdate?: (update: SpeedUpdate) => void
  latencySamples?: number
  downloadMs?: number
  uploadMs?: number
  warmupMs?: number
  streams?: number
  tickMs?: number
  fetchImpl?: typeof fetch
  createXhr?: () => XMLHttpRequest
  now?: () => number
}

const DOWNLOAD_CHUNK = 25_000_000
const UPLOAD_CHUNK = 4_000_000

const bust = () => Math.random().toString(36).slice(2)

function abortError(): DOMException {
  return new DOMException('Speed test cancelled', 'AbortError')
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })
}

/**
 * `/meta` rejects cross-origin callers with 403, so the edge and client details are read from the
 * headers Cloudflare attaches to every `__down` response instead.
 */
async function fetchEdge(fetchImpl: typeof fetch, signal?: AbortSignal): Promise<SpeedServer> {
  try {
    const res = await fetchImpl(`${SPEEDTEST_BASE}/__down?bytes=0&r=${bust()}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal,
    })
    await res.arrayBuffer()
    const h = (name: string) => res.headers.get(`cf-meta-${name}`) ?? res.headers.get(name) ?? undefined
    const asn = Number(h('asn'))
    return mergeServer({
      colo: h('colo'),
      ip: h('ip'),
      asn: Number.isFinite(asn) && asn > 0 ? asn : undefined,
      clientCity: h('city'),
      clientCountry: h('country'),
    })
  } catch (error) {
    if (signal?.aborted) throw abortError()
    void error
    return {}
  }
}

async function measureLatency(o: Required<Pick<SpeedTestOptions, 'latencySamples' | 'fetchImpl' | 'now'>> & SpeedTestOptions) {
  const samples: number[] = []
  // The first request also pays for DNS/TLS setup, so it is discarded.
  for (let i = 0; i <= o.latencySamples; i++) {
    if (o.signal?.aborted) throw abortError()
    const started = o.now()
    const res = await o.fetchImpl(`${SPEEDTEST_BASE}/__down?bytes=0&r=${bust()}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: o.signal,
    })
    await res.arrayBuffer()
    const rtt = Math.max(0, o.now() - started - serverTimingMs(res.headers.get('server-timing')))
    if (i === 0) continue
    samples.push(rtt)
    o.onUpdate?.({
      type: 'latency',
      pingMs: median(samples)!,
      jitterMs: jitter(samples) ?? 0,
      progress: i / o.latencySamples,
    })
  }
  return { pingMs: median(samples), jitterMs: jitter(samples) }
}

/** Samples the byte counter on a fixed tick until the phase duration elapses or the user cancels. */
async function sampleThroughput(
  phase: 'download' | 'upload',
  durationMs: number,
  bytes: () => number,
  o: Required<Pick<SpeedTestOptions, 'tickMs' | 'warmupMs' | 'now'>> & SpeedTestOptions,
): Promise<ThroughputPoint[]> {
  const start = o.now()
  const points: ThroughputPoint[] = [{ t: start, bytes: 0 }]
  while (o.now() - start < durationMs) {
    await wait(o.tickMs, o.signal)
    const t = o.now()
    points.push({ t, bytes: bytes() })
    o.onUpdate?.({
      type: 'throughput',
      phase,
      mbps: windowMbps(points),
      progress: Math.min(1, (t - start) / durationMs),
      elapsedMs: t - start,
    })
  }
  return points
}

async function measureDownload(o: Required<Omit<SpeedTestOptions, 'signal' | 'onUpdate' | 'createXhr'>> & SpeedTestOptions) {
  const controller = new AbortController()
  const stop = () => controller.abort()
  o.signal?.addEventListener('abort', stop, { once: true })
  let received = 0
  let lastError: unknown = null

  const worker = async () => {
    while (!controller.signal.aborted) {
      try {
        const res = await o.fetchImpl(`${SPEEDTEST_BASE}/__down?bytes=${DOWNLOAD_CHUNK}&r=${bust()}`, {
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        })
        if (!res.body) {
          received += (await res.arrayBuffer()).byteLength
          continue
        }
        const reader = res.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          received += value.byteLength
        }
      } catch (error) {
        if (controller.signal.aborted) return
        lastError = error
        await wait(250, controller.signal).catch(() => undefined)
      }
    }
  }

  const workers = Array.from({ length: o.streams }, worker)
  try {
    const points = await sampleThroughput('download', o.downloadMs, () => received, o)
    if (!received && lastError) throw lastError instanceof Error ? lastError : new Error('Download failed')
    return { mbps: finalMbps(points, o.warmupMs), bytes: received }
  } finally {
    stop()
    o.signal?.removeEventListener('abort', stop)
    await Promise.allSettled(workers)
  }
}

async function measureUpload(o: Required<Omit<SpeedTestOptions, 'signal' | 'onUpdate'>> & SpeedTestOptions) {
  const payload = new Blob([new Uint8Array(UPLOAD_CHUNK)], { type: 'application/octet-stream' })
  const active = new Set<XMLHttpRequest>()
  let sent = 0
  let stopped = false
  let failures = 0

  const worker = () =>
    new Promise<void>((resolve) => {
      const next = () => {
        if (stopped || failures > 6) return resolve()
        const xhr = o.createXhr()
        let counted = 0
        xhr.upload.onprogress = (e) => {
          sent += e.loaded - counted
          counted = e.loaded
        }
        xhr.onload = () => {
          active.delete(xhr)
          sent += UPLOAD_CHUNK - counted
          next()
        }
        xhr.onerror = xhr.onabort = () => {
          active.delete(xhr)
          if (!stopped) failures++
          if (stopped) resolve()
          else setTimeout(next, 250)
        }
        xhr.open('POST', `${SPEEDTEST_BASE}/__up?r=${bust()}`)
        active.add(xhr)
        xhr.send(payload)
      }
      next()
    })

  const workers = Array.from({ length: o.streams }, worker)
  try {
    const points = await sampleThroughput('upload', o.uploadMs, () => sent, o)
    if (!sent && failures) throw new Error('Upload failed')
    return { mbps: finalMbps(points, o.warmupMs), bytes: sent }
  } finally {
    stopped = true
    for (const xhr of active) xhr.abort()
    await Promise.race([Promise.allSettled(workers), wait(500).catch(() => undefined)])
  }
}

/** Ping, then multi-stream download and upload against Cloudflare's speed test edge. */
export async function runSpeedTest(options: SpeedTestOptions = {}): Promise<SpeedTestResult> {
  const o = {
    latencySamples: 12,
    downloadMs: 10_000,
    uploadMs: 8_000,
    warmupMs: 2_000,
    streams: 4,
    tickMs: 200,
    fetchImpl: globalThis.fetch.bind(globalThis),
    createXhr: () => new XMLHttpRequest(),
    now: () => performance.now(),
    ...options,
  }

  o.onUpdate?.({ type: 'phase', phase: 'latency' })
  let server = await fetchEdge(o.fetchImpl, o.signal)
  o.onUpdate?.({ type: 'server', server })
  // The ISP lookup runs alongside the measurements so a slow lookup never delays the test.
  const lookup = lookupConnection(server.ip, { signal: o.signal, fetchImpl: o.fetchImpl })
    .then((extra) => {
      server = mergeServer(server, extra)
      if (!o.signal?.aborted) o.onUpdate?.({ type: 'server', server })
    })
    .catch(() => undefined)
  const latency = await measureLatency(o)

  o.onUpdate?.({ type: 'phase', phase: 'download' })
  const download = await measureDownload(o)
  o.onUpdate?.({ type: 'final', phase: 'download', mbps: download.mbps })

  o.onUpdate?.({ type: 'phase', phase: 'upload' })
  const upload = await measureUpload(o)
  o.onUpdate?.({ type: 'final', phase: 'upload', mbps: upload.mbps })

  await Promise.race([lookup, wait(3_000, o.signal)])
  o.onUpdate?.({ type: 'phase', phase: 'done' })
  return {
    at: Date.now(),
    pingMs: latency.pingMs,
    jitterMs: latency.jitterMs,
    downloadMbps: download.mbps,
    uploadMbps: upload.mbps,
    downloadBytes: download.bytes,
    uploadBytes: upload.bytes,
    server,
  }
}
