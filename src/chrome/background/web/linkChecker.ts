import { registerMessageHandler } from '@/core/messaging'
import {
  clampTimeout,
  type LinkCheckRequestOptions,
  type LinkCheckResult,
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

export function registerLinkChecker(): void {
  registerMessageHandler('CHECK_HTTP_URLS', async (message) => {
    if (message.type !== 'CHECK_HTTP_URLS') return null
    const items = message.items.slice(0, MAX_ITEMS)
    return Promise.all(items.map((item) => checkItem(item, message.options)))
  })
}
