export interface UrlStatusResult {
  url: string
  status: number | null
  ok: boolean
  error?: string
  redirected?: boolean
}

const DEFAULT_CONCURRENCY = 6
const DEFAULT_CAP = 300
const TIMEOUT_MS = 10_000

export async function checkUrlStatuses(
  urls: string[],
  options?: {
    concurrency?: number
    cap?: number
    onProgress?: (done: number, total: number) => void
    signal?: AbortSignal
  },
): Promise<Map<string, UrlStatusResult>> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
  const cap = options?.cap ?? DEFAULT_CAP
  const unique = [...new Set(urls)].slice(0, cap)
  const results = new Map<string, UrlStatusResult>()
  let done = 0

  const queue = [...unique]
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      if (options?.signal?.aborted) return
      const url = queue.shift()
      if (!url) return
      const result = await probeUrl(url)
      results.set(url, result)
      done += 1
      options?.onProgress?.(done, unique.length)
    }
  })

  await Promise.all(workers)
  return results
}

async function probeUrl(url: string): Promise<UrlStatusResult> {
  if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) {
    return { url, status: null, ok: true }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (res.status === 405 || res.status === 501) {
      const c2 = new AbortController()
      const t2 = setTimeout(() => c2.abort(), TIMEOUT_MS)
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: c2.signal,
        credentials: 'omit',
        redirect: 'follow',
      })
      clearTimeout(t2)
    }
    const ok = res.status >= 200 && res.status < 400
    return {
      url,
      status: res.status,
      ok,
      redirected: res.redirected,
    }
  } catch (error: unknown) {
    return {
      url,
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  }
}
