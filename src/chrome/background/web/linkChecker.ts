import { registerMessageHandler } from '@/core/messaging'
import {
  clampTimeout,
  type LinkCheckRequestOptions,
  type LinkCheckResult,
} from '@/core/engines/linkChecker/check'

const MAX_ITEMS = 80

type Probe = Omit<LinkCheckResult, 'href' | 'text' | 'ok'>

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

export function registerLinkChecker(): void {
  registerMessageHandler('CHECK_HTTP_URLS', async (message) => {
    if (message.type !== 'CHECK_HTTP_URLS') return null
    const items = message.items.slice(0, MAX_ITEMS)
    const results: LinkCheckResult[] = []
    for (const item of items) {
      const result = await checkUrl(item.href, message.options)
      results.push({ href: item.href, text: item.text, ...result })
    }
    return results
  })
}
