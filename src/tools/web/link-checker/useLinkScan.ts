import { useCallback, useEffect, useRef, useState } from 'react'

import type { LinkCheckRequestOptions, LinkCheckResult } from '@/core/engines/linkChecker/check'
import {
  classifyResult,
  isRetryable,
  type CheckEntry,
  type CheckSettings,
  type CheckTarget,
} from '@/core/engines/linkChecker/report'
import { sendMessage } from '@/core/messaging'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'

export type ScanPhase = 'idle' | 'running' | 'paused' | 'done' | 'stopped'

export interface ScanProgress {
  done: number
  total: number
  retrying: boolean
}

export interface ScanTiming {
  startedAt: number
  finishedAt: number | null
  pausedMs: number
}

const RETRY_DELAY_MS = 600

async function checkOne(target: CheckTarget, options: LinkCheckRequestOptions): Promise<LinkCheckResult> {
  const results = await sendMessage<LinkCheckResult[]>({
    type: 'CHECK_HTTP_URLS',
    items: [{ href: target.url, text: target.text }],
    options,
  })
  return results?.[0] ?? { href: target.url, text: target.text, status: null, ok: false, error: 'No response from the extension' }
}

export function scanElapsedMs(timing: ScanTiming | null, now: number, pausedSince: number | null = null): number {
  if (!timing) return 0
  const end = timing.finishedAt ?? now
  const pausing = pausedSince != null && timing.finishedAt == null ? now - pausedSince : 0
  return Math.max(0, end - timing.startedAt - timing.pausedMs - pausing)
}

export function useLinkScan() {
  const [entries, setEntries] = useState<Map<string, CheckEntry>>(() => new Map())
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [timing, setTiming] = useState<ScanTiming | null>(null)
  const [pausedSince, setPausedSince] = useState<number | null>(null)
  const [mode, setMode] = useState<'fresh' | 'recheck'>('fresh')
  const runRef = useRef(0)
  const gate = useRef<{ promise: Promise<void>; release: () => void } | null>(null)
  const entriesRef = useRef(entries)
  /** Results to put back if a re-check is stopped before it reaches them. */
  const restore = useRef(new Map<string, CheckEntry>())

  useEffect(() => {
    entriesRef.current = entries
  })

  useEffect(() => {
    const current = runRef
    const pauseGate = gate
    return () => {
      current.current += 1
      pauseGate.current?.release()
    }
  }, [])

  const openGate = useCallback(() => {
    gate.current?.release()
    gate.current = null
    setPausedSince(null)
  }, [])

  const markChecking = useCallback((targets: CheckTarget[], fresh: boolean) => {
    const previous = fresh ? new Map<string, CheckEntry>() : entriesRef.current
    for (const target of targets) {
      const old = previous.get(target.url)
      if (old?.state.phase === 'done' && !restore.current.has(target.url)) restore.current.set(target.url, old)
    }
    setEntries((prev) => {
      const next = fresh ? new Map<string, CheckEntry>() : new Map(prev)
      for (const target of targets) next.set(target.url, { target, state: { phase: 'queued' } })
      return next
    })
  }, [])

  const execute = useCallback(
    async (targets: CheckTarget[], settings: CheckSettings, fresh: boolean) => {
      const run = ++runRef.current
      openGate()
      restore.current = new Map()
      markChecking(targets, fresh)
      setMode(fresh ? 'fresh' : 'recheck')
      setProgress({ done: 0, total: targets.length, retrying: false })
      setPhase('running')
      setTiming({ startedAt: Date.now(), finishedAt: null, pausedMs: 0 })
      const finish = () => {
        if (runRef.current !== run) return
        restore.current = new Map()
        setProgress(null)
        setPhase('done')
        setTiming((prev) => prev && { ...prev, finishedAt: Date.now() })
      }
      if (targets.length === 0) {
        finish()
        return
      }
      // Other sites' links are cross-origin requests; without access they fail on CORS.
      await requestAllSitesAccess()
      const options: LinkCheckRequestOptions = { timeoutMs: settings.timeoutMs, method: settings.method }
      const failed: CheckTarget[] = []

      const pass = async (items: CheckTarget[], retrying: boolean) => {
        let cursor = 0
        let done = 0
        setProgress({ done: 0, total: items.length, retrying })
        const worker = async () => {
          while (runRef.current === run) {
            if (gate.current) await gate.current.promise
            if (runRef.current !== run || cursor >= items.length) return
            const target = items[cursor]
            cursor += 1
            setEntries((prev) => {
              const next = new Map(prev)
              next.set(target.url, { target, state: { phase: 'checking' } })
              return next
            })
            const result = await checkOne(target, options)
            if (runRef.current !== run) return
            const health = classifyResult(result)
            if (!retrying && settings.retryFailures && isRetryable(health)) failed.push(target)
            restore.current.delete(target.url)
            setEntries((prev) => {
              const next = new Map(prev)
              next.set(target.url, { target, state: { phase: 'done', result, health, retried: retrying || undefined } })
              return next
            })
            done += 1
            setProgress({ done, total: items.length, retrying })
          }
        }
        await Promise.all(Array.from({ length: Math.min(settings.concurrency, items.length) }, worker))
      }

      await pass(targets, false)
      if (runRef.current === run && failed.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        if (runRef.current !== run) return
        const retry = [...failed].sort((a, b) => a.order - b.order)
        markChecking(retry, false)
        await pass(retry, true)
      }
      finish()
    },
    [markChecking, openGate],
  )

  const start = useCallback(
    (targets: CheckTarget[], settings: CheckSettings) => execute(targets, settings, true),
    [execute],
  )

  const recheck = useCallback(
    (targets: CheckTarget[], settings: CheckSettings) => execute(targets, settings, false),
    [execute],
  )

  const pause = useCallback(() => {
    if (gate.current) return
    let release: () => void = () => undefined
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    gate.current = { promise, release }
    setPausedSince(Date.now())
    setPhase('paused')
  }, [])

  const resume = useCallback(() => {
    if (!gate.current) return
    const since = pausedSince
    openGate()
    if (since != null) setTiming((prev) => prev && { ...prev, pausedMs: prev.pausedMs + (Date.now() - since) })
    setPhase('running')
  }, [openGate, pausedSince])

  const stop = useCallback(() => {
    runRef.current += 1
    const since = pausedSince
    openGate()
    const restored = restore.current
    restore.current = new Map()
    setProgress(null)
    setPhase(mode === 'recheck' ? 'done' : 'stopped')
    setTiming(
      (prev) =>
        prev && { ...prev, finishedAt: Date.now(), pausedMs: prev.pausedMs + (since != null ? Date.now() - since : 0) },
    )
    setEntries((prev) => {
      const next = new Map<string, CheckEntry>()
      for (const [url, entry] of prev) {
        if (entry.state.phase === 'done') next.set(url, entry)
        else if (restored.has(url)) next.set(url, restored.get(url)!)
      }
      return next
    })
  }, [mode, openGate, pausedSince])

  const reset = useCallback(() => {
    runRef.current += 1
    openGate()
    restore.current = new Map()
    setEntries(new Map())
    setProgress(null)
    setPhase('idle')
    setTiming(null)
    setMode('fresh')
  }, [openGate])

  return {
    entries,
    progress,
    phase,
    timing,
    pausedSince,
    mode,
    running: phase === 'running' || phase === 'paused',
    start,
    recheck,
    pause,
    resume,
    stop,
    reset,
  }
}
