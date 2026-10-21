import { registerMessageHandler } from '@/core/messaging'
import type { LinkCheckResult } from '@/core/engines/linkChecker/check'

async function headStatus(url: string): Promise<{ status: number | null; error?: string }> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store' })
    return { status: res.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' })
      return { status: res.status }
    } catch {
      return { status: null, error: message }
    }
  }
}

export function registerLinkChecker(): void {
  registerMessageHandler('CHECK_HTTP_URLS', async (message) => {
    if (message.type !== 'CHECK_HTTP_URLS') return null
    const items = message.items.slice(0, 80)
    const results: LinkCheckResult[] = []
    for (const item of items) {
      const { status, error } = await headStatus(item.href)
      const ok = status != null && status < 400
      results.push({ href: item.href, text: item.text, status, ok, error })
    }
    return results
  })
}
