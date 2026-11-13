import { useCallback, useEffect, useRef, useState } from 'react'

import type { LinkCheckResult } from '@/core/engines/linkChecker/check'
import { classifyResult } from '@/core/engines/linkChecker/report'
import type { LinkStatusInfo } from '@/core/engines/links/pageLinks'
import { sendMessage } from '@/core/messaging'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'

const BATCH_SIZE = 4
const CONCURRENCY = 6
export const MAX_CHECKED_URLS = 600

export interface CheckProgress {
  done: number
  total: number
}

function toStatus(result: LinkCheckResult | undefined): LinkStatusInfo {
  if (!result) return { checking: false, status: null, ok: false, error: 'No response', health: 'network' }
  return {
    checking: false,
    status: result.status,
    ok: result.ok,
    error: result.error,
    health: classifyResult(result),
    redirected: result.redirected,
    finalUrl: result.finalUrl,
    timedOut: result.timedOut,
  }
}

export function useLinkChecks() {
  const [statuses, setStatuses] = useState<Map<string, LinkStatusInfo>>(() => new Map())
  const [results, setResults] = useState<Map<string, LinkCheckResult>>(() => new Map())
  const [progress, setProgress] = useState<CheckProgress | null>(null)
  const runRef = useRef(0)

  useEffect(() => {
    const current = runRef
    return () => {
      current.current += 1
    }
  }, [])

  const run = useCallback(async (hrefs: string[], replace = false, timeoutMs?: number) => {
    const run = ++runRef.current
    const queue = [...new Set(hrefs.filter((href) => /^https?:\/\//i.test(href)))].slice(0, MAX_CHECKED_URLS)
    setStatuses((prev) => {
      const next = replace ? new Map<string, LinkStatusInfo>() : new Map(prev)
      for (const href of queue) next.set(href, { checking: true, status: null, ok: false })
      return next
    })
    setProgress({ done: 0, total: queue.length })
    if (queue.length === 0) {
      setProgress(null)
      return
    }
    await requestAllSitesAccess()

    let cursor = 0
    let done = 0
    const worker = async () => {
      while (cursor < queue.length && runRef.current === run) {
        const batch = queue.slice(cursor, cursor + BATCH_SIZE)
        cursor += BATCH_SIZE
        const batchResults = await sendMessage<LinkCheckResult[]>({
          type: 'CHECK_HTTP_URLS',
          items: batch.map((href) => ({ href, text: '' })),
          options: timeoutMs ? { timeoutMs } : undefined,
        })
        if (runRef.current !== run) return
        const byHref = new Map((batchResults ?? []).map((result) => [result.href, result]))
        setResults((prev) => {
          const next = new Map(prev)
          for (const href of batch) {
            const result = byHref.get(href)
            if (result) next.set(href, result)
          }
          return next
        })
        setStatuses((prev) => {
          const next = new Map(prev)
          for (const href of batch) next.set(href, toStatus(byHref.get(href)))
          return next
        })
        done += batch.length
        setProgress({ done, total: queue.length })
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
    if (runRef.current === run) setProgress(null)
  }, [])

  const cancel = useCallback(() => {
    runRef.current += 1
    setProgress(null)
    setStatuses((prev) => {
      const next = new Map<string, LinkStatusInfo>()
      for (const [href, info] of prev) if (!info.checking) next.set(href, info)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    runRef.current += 1
    setProgress(null)
    setStatuses(new Map())
    setResults(new Map())
  }, [])

  return { statuses, results, progress, checking: progress !== null, run, cancel, reset }
}
