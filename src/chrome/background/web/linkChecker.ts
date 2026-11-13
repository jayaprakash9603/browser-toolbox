import { registerMessageHandler } from '@/core/messaging'
import {
  clampTimeout,
  MAX_REDIRECT_HOPS,
  type LinkCheckRequestOptions,
  type LinkCheckResult,
  type RedirectHop,
} from '@/core/engines/linkChecker/check'

const MAX_ITEMS = 80
/** Chrome multiplexes HTTP/2; HTTP/1.1 still caps around this per host. */
const PER_HOST = 12
const GLOBAL = 32

type Probe = Omit<LinkCheckResult, 'href' | 'text' | 'ok'>
type Waiter = { host: string; resume: () => void }

let globalActive = 0
const hostActive = new Map<string, number>()
const waiting: Waiter[] = []

function hostname(href: string): string {
  try {
    return new URL(href).hostname
  } catch {
    return ''
  }
}

function allowed(host: string) {
  return globalActive < GLOBAL && (hostActive.get(host) ?? 0) < PER_HOST
}

function take(host: string) {
  globalActive += 1
  hostActive.set(host, (hostActive.get(host) ?? 0) + 1)
}

function acquireHost(host: string): Promise<void> {
  if (allowed(host)) {
    take(host)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waiting.push({
      host,
      resume: () => {
        take(host)
        resolve()
      },
    })
  })
}

function releaseHost(host: string) {
  globalActive = Math.max(0, globalActive - 1)
  const next = Math.max(0, (hostActive.get(host) ?? 1) - 1)
  if (next === 0) hostActive.delete(host)
  else hostActive.set(host, next)
  const index = waiting.findIndex((waiter) => allowed(waiter.host))
  if (index < 0) return
  const [waiter] = waiting.splice(index, 1)
  waiter.resume()
}

async function probe(url: string, method: 'HEAD' | 'GET', timeoutMs: number): Promise<Probe> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = performance.now()
  try {
    const res = await fetch(url, { method, redirect: 'follow', cache: 'no-store', signal: controller.signal })
    const durationMs = Math.round(performance.now() - started)
    // Only the status matters; don't download large pages or files.
    void res.body?.cancel().catch(() => undefined)
    return { status: res.status, finalUrl: res.url || url, redirected: res.redirected, durationMs, method }
  } catch (error) {
    const durationMs = Math.round(performance.now() - started)
    if (controller.signal.aborted) {
      return { status: null, timedOut: true, error: `Timed out after ${Math.round(timeoutMs / 1000)}s`, durationMs, method }
    }
    return { status: null, error: error instanceof Error ? error.message : 'Request failed', durationMs, method }
  } finally {
    clearTimeout(timer)
  }
}

export async function checkUrl(href: string, options: LinkCheckRequestOptions = {}): Promise<Probe & { ok: boolean }> {
  const timeoutMs = clampTimeout(options.timeoutMs)
  let result: Probe | null = options.method === 'get' ? null : await probe(href, 'HEAD', timeoutMs)
  // Many servers reject or mishandle HEAD, so a failed HEAD is confirmed with a real GET.
  const confirm = !result || (result.status == null ? !result.timedOut : result.status >= 400)
  if (confirm) result = await probe(href, 'GET', timeoutMs)
  const final = result!
  return { ...final, ok: final.status != null && final.status < 400 }
}

async function checkItem(
  item: { href: string; text: string },
  options: LinkCheckRequestOptions | undefined,
): Promise<LinkCheckResult> {
  const host = hostname(item.href)
  await acquireHost(host)
  try {
    const result = await checkUrl(item.href, options)
    return { href: item.href, text: item.text, ...result }
  } finally {
    releaseHost(host)
  }
}

async function hop(url: string, timeoutMs: number): Promise<{ status: number | null; location: string | null; timedOut: boolean }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', cache: 'no-store', signal: controller.signal })
    void res.body?.cancel().catch(() => undefined)
    return { status: res.status, location: res.headers.get('location'), timedOut: false }
  } catch {
    return { status: null, location: null, timedOut: controller.signal.aborted }
  } finally {
    clearTimeout(timer)
  }
}

export async function traceRedirects(
  href: string,
  options: LinkCheckRequestOptions = {},
): Promise<Pick<LinkCheckResult, 'hops' | 'loop' | 'finalUrl' | 'status' | 'redirected' | 'timedOut' | 'error'>> {
  const timeoutMs = clampTimeout(options.timeoutMs)
  const hops: RedirectHop[] = []
  const seen = new Set<string>()
  let current = href
  for (let index = 0; index < MAX_REDIRECT_HOPS; index += 1) {
    if (seen.has(current)) return { hops, loop: true, finalUrl: current, status: hops.at(-1)?.status ?? null, redirected: hops.length > 1 }
    seen.add(current)
    const step = await hop(current, timeoutMs)
    hops.push({ url: current, status: step.status })
    if (step.timedOut) return { hops, loop: false, finalUrl: current, status: null, redirected: hops.length > 1, timedOut: true, error: 'Timed out' }
    if (step.status == null || step.status < 300 || step.status >= 400 || !step.location) {
      return { hops, loop: false, finalUrl: current, status: step.status, redirected: hops.length > 1 }
    }
    try {
      current = new URL(step.location, current).href
    } catch {
      return { hops, loop: false, finalUrl: current, status: step.status, redirected: hops.length > 1, error: 'Invalid Location header' }
    }
  }
  return { hops, loop: false, finalUrl: current, status: hops.at(-1)?.status ?? null, redirected: true }
}

export async function checkHttpItems(
  items: { href: string; text: string }[],
  options?: LinkCheckRequestOptions,
): Promise<LinkCheckResult[]> {
  return Promise.all(items.slice(0, MAX_ITEMS).map((item) => checkItem(item, options)))
}

export function registerLinkChecker(): void {
  registerMessageHandler('CHECK_HTTP_URLS', async (message) => {
    if (message.type !== 'CHECK_HTTP_URLS') return null
    return checkHttpItems(message.items, message.options)
  })
  registerMessageHandler('TRACE_HTTP_REDIRECTS', async (message) => {
    if (message.type !== 'TRACE_HTTP_REDIRECTS') return null
    return traceRedirects(message.href, message.options)
  })
}
