import { IP_ENDPOINT, IP_REFRESH_MS, PROBE_TIMEOUT_MS } from '@/core/netmon/constants'
import { playNetSound } from '@/core/netmon/sounds'
import type { NetStatus } from '@/core/netmon/types'
import { isExtensionMessage, type ExtensionMessage } from '@/core/messaging/types'

type Config = Extract<ExtensionMessage, { type: 'NETMON_OFFSCREEN_CONFIG' }>

let config: Config | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let inFlight = false
let tickStartedAt = 0
const STUCK_TICK_MS = PROBE_TIMEOUT_MS * 3
let failures = 0
let lastStatus: NetStatus | null = null
let ip: string | undefined
let ipFetchedAt = 0

function cacheBusted(url: string): string {
  const u = new URL(url)
  u.searchParams.set('_tbx', Date.now().toString(36))
  return u.toString()
}

/** no-cors keeps any host usable as a ping target; an opaque response still proves reachability. */
async function probe(url: string): Promise<number | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const started = performance.now()
  try {
    await fetch(cacheBusted(url), { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: controller.signal })
    return performance.now() - started
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function refreshIp(force: boolean): Promise<void> {
  if (!force && ip && Date.now() - ipFetchedAt < IP_REFRESH_MS) return
  ipFetchedAt = Date.now()
  // Without a timeout a stalled lookup would block every later sample ("Checking…" forever).
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(IP_ENDPOINT, { cache: 'no-store', credentials: 'omit', signal: controller.signal })
    const data = (await res.json()) as { ip?: string }
    if (data.ip) ip = data.ip
  } catch {
    // Keeps the previous address; it is retried on the next refresh.
  } finally {
    clearTimeout(timeout)
  }
}

async function tick(): Promise<void> {
  if (!config?.enabled) return
  // A tick that never finished (hung request, suspended page) must not stop monitoring.
  if (inFlight && Date.now() - tickStartedAt < STUCK_TICK_MS) return
  inFlight = true
  tickStartedAt = Date.now()
  try {
    let status: NetStatus
    let latency: number | null = null
    if (!navigator.onLine) {
      status = 'offline'
      failures = 2
    } else {
      latency = await probe(config.pingUrl)
      if (latency !== null) {
        status = 'online'
        failures = 0
      } else {
        failures++
        // A single dropped probe is noise; the adapter being up without internet means LAN-only.
        status = failures >= 2 ? 'lan' : (lastStatus ?? 'lan')
      }
    }
    if (status === 'online' && config.showIp) await refreshIp(lastStatus !== 'online')
    if (status !== 'online') ip = undefined
    lastStatus = status
    if (!config?.enabled) return
    await chrome.runtime
      .sendMessage({ type: 'NETMON_SAMPLE', status, latency, ip: config.showIp ? ip : undefined })
      .catch(() => {})
  } catch {
    // Never let one failed tick break the loop; the next one retries.
  } finally {
    inFlight = false
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer)
  timer = null
  if (!config?.enabled) return
  const loop = async () => {
    try {
      await tick()
    } finally {
      if (config?.enabled) timer = setTimeout(loop, config.intervalSec * 1000)
    }
  }
  void loop()
}

function applyConfig(next: Config | null): void {
  const changed =
    !config ||
    !next ||
    config.enabled !== next.enabled ||
    config.intervalSec !== next.intervalSec ||
    config.pingUrl !== next.pingUrl
  config = next
  if (!next?.enabled) {
    lastStatus = null
    failures = 0
  }
  // The background re-sends the config every minute; use it to revive a loop that died.
  if (changed || (next?.enabled && !timer)) schedule()
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false
  if (raw.type === 'NETMON_OFFSCREEN_CONFIG') {
    applyConfig(raw)
    sendResponse({ ok: true, data: { applied: true } })
    return false
  }
  if (raw.type === 'NETMON_OFFSCREEN_SOUND') {
    void playNetSound(raw.sound, raw.volume)
    sendResponse({ ok: true, data: { played: true } })
    return false
  }
  return false
})

window.addEventListener('online', () => void tick())
window.addEventListener('offline', () => void tick())

void chrome.runtime
  .sendMessage({ type: 'NETMON_OFFSCREEN_READY' })
  .then((response: { ok?: boolean; data?: Config | null } | undefined) => {
    if (response?.ok && response.data) applyConfig(response.data)
  })
  .catch(() => {})
