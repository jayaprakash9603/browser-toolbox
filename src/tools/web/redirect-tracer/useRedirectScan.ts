import { useCallback, useEffect, useRef, useState } from 'react'

import type { LinkCheckResult } from '@/core/engines/linkChecker/check'
import {
  toTraceView,
  type RedirectEntry,
  type RedirectTarget,
} from '@/core/engines/redirects/chain'
import { REDIRECT_CONCURRENCY, REDIRECT_TIMEOUT_MS } from '@/core/engines/redirects/targets'
import { sendMessage } from '@/core/messaging'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'

export type ScanPhase = 'idle' | 'running' | 'paused' | 'done' | 'stopped'

export interface ScanProgress {
  done: number
  total: number
}

const FLUSH_MS = 80

export async function traceTarget(target: RedirectTarget): Promise<RedirectEntry> {
  const result = await traceUrl(target.url)
  return { target, phase: 'done', trace: toTraceView({ ...result, href: target.url }) }
}

async function traceUrl(href: string): Promise<LinkCheckResult> {
  const result = await sendMessage<Pick<LinkCheckResult, 'hops' | 'loop' | 'finalUrl' | 'status' | 'redirected' | 'timedOut' | 'error' | 'durationMs'>>(
    {
      type: 'TRACE_HTTP_REDIRECTS',
      href,
      options: { timeoutMs: REDIRECT_TIMEOUT_MS },
    },
  )
  return {
    href,
    text: '',
    ok: result?.status != null && result.status < 400,
    status: result?.status ?? null,
    hops: result?.hops,
    loop: result?.loop,
    finalUrl: result?.finalUrl ?? href,
    redirected: result?.redirected,
    timedOut: result?.timedOut,
    error: result?.error ?? (result ? undefined : 'No response from the extension'),
    durationMs: result?.durationMs,
  }
}

export function useRedirectScan() {
  const [entries, setEntries] = useState<Map<string, RedirectEntry>>(() => new Map())
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const runRef = useRef(0)
  const gate = useRef<{ promise: Promise<void>; release: () => void } | null>(null)
  const live = useRef(new Map<string, RedirectEntry>())
  const doneRef = useRef(0)
  const totalRef = useRef(0)
  const flushTimer = useRef<number | null>(null)

  const clearFlush = () => {
    if (flushTimer.current == null) return
    window.clearTimeout(flushTimer.current)
    flushTimer.current = null
  }

  const publish = () => {
    setEntries(new Map(live.current))
    setProgress(totalRef.current > 0 ? { done: doneRef.current, total: totalRef.current } : null)
  }

  const schedule = () => {
    if (flushTimer.current != null) return
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null
      publish()
    }, FLUSH_MS)
  }

  useEffect(() => {
    const current = runRef
    return () => {
      current.current += 1
      gate.current?.release()
      if (flushTimer.current != null) window.clearTimeout(flushTimer.current)
    }
  }, [])

  const openGate = useCallback(() => {
    gate.current?.release()
    gate.current = null
  }, [])

  const applyResult = (target: RedirectTarget, result: LinkCheckResult) => {
    live.current.set(target.url, { target, phase: 'done', trace: toTraceView({ ...result, href: target.url }) })
  }

  const start = useCallback(
    async (targets: RedirectTarget[]) => {
      const run = ++runRef.current
      openGate()
      live.current = new Map()
      doneRef.current = 0
      totalRef.current = targets.length
      setEntries(new Map())
      setProgress({ done: 0, total: targets.length })
      setPhase('running')
      await requestAllSitesAccess()
      if (runRef.current !== run) return
      if (targets.length === 0) {
        setPhase('done')
        setProgress(null)
        return
      }
      let cursor = 0
      const worker = async () => {
        while (runRef.current === run) {
          if (gate.current) await gate.current.promise
          if (runRef.current !== run || cursor >= targets.length) return
          const target = targets[cursor]
          cursor += 1
          live.current.set(target.url, { target, phase: 'checking' })
          schedule()
          const result = await traceUrl(target.url)
          if (runRef.current !== run) return
          applyResult(target, result)
          doneRef.current += 1
          schedule()
        }
      }
      await Promise.all(Array.from({ length: Math.min(REDIRECT_CONCURRENCY, targets.length) }, worker))
      if (runRef.current !== run) return
      clearFlush()
      publish()
      setProgress(null)
      setPhase('done')
    },
    [openGate],
  )

  const pause = useCallback(() => {
    if (gate.current) return
    let release: () => void = () => undefined
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    gate.current = { promise, release }
    clearFlush()
    publish()
    setPhase('paused')
  }, [])

  const resume = useCallback(() => {
    if (!gate.current) return
    openGate()
    setPhase('running')
  }, [openGate])

  const stop = useCallback(() => {
    runRef.current += 1
    openGate()
    clearFlush()
    const next = new Map<string, RedirectEntry>()
    for (const [url, item] of live.current) {
      if (item.phase === 'done') next.set(url, item)
    }
    live.current = next
    setEntries(next)
    setProgress(null)
    setPhase('stopped')
  }, [openGate])

  const reset = useCallback(() => {
    runRef.current += 1
    openGate()
    live.current = new Map()
    clearFlush()
    setEntries(new Map())
    setProgress(null)
    setPhase('idle')
  }, [openGate])

  const upsert = useCallback(async (target: RedirectTarget) => {
    live.current.set(target.url, { target, phase: 'checking' })
    setEntries(new Map(live.current))
    const result = await traceUrl(target.url)
    applyResult(target, result)
    setEntries(new Map(live.current))
  }, [])

  return {
    entries,
    progress,
    phase,
    running: phase === 'running' || phase === 'paused',
    start,
    pause,
    resume,
    stop,
    reset,
    upsert,
  }
}
