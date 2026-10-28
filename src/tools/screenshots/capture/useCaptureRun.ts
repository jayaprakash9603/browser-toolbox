import { useCallback, useEffect, useRef, useState } from 'react'

import { sendMessage } from '@/core/messaging/messageService'

import { usesCountdown, type LauncherMode } from './modes'

export type RunMode = LauncherMode | 'batch-urls'

export type CaptureRun =
  | { phase: 'idle' }
  | { phase: 'countdown'; mode: RunMode; remaining: number; total: number }
  | { phase: 'running'; mode: RunMode; current: number; total: number }

const TICK_MS = 100

function isProgressMessage(value: unknown): value is { current: number; total: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'SCREENSHOT_PROGRESS' &&
    typeof (value as { current?: unknown }).current === 'number'
  )
}

async function execute(mode: RunMode, urls?: string[]): Promise<boolean> {
  if (mode === 'menu') {
    const result = await sendMessage<{ ok: boolean }>({ type: 'SCREENSHOT_MENU_OPEN' })
    return Boolean(result?.ok)
  }
  const result = await sendMessage<{ sessionId: string | null }>({ type: 'SCREENSHOT_START', mode, urls })
  return Boolean(result?.sessionId)
}

/**
 * Runs captures from the launcher: an optional countdown first, then the capture itself, with the
 * background's progress (tab 2 of 5) folded in. `start` resolves to whether a capture was made.
 */
export function useCaptureRun(delaySec: number) {
  const [run, setRun] = useState<CaptureRun>({ phase: 'idle' })
  /** Bumped each time a shot is taken, to replay the shutter flash. */
  const [shots, setShots] = useState(0)
  const busy = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const settle = useRef<((ok: boolean) => void) | null>(null)

  useEffect(() => {
    const onMessage = (message: unknown) => {
      if (!isProgressMessage(message)) return
      setRun((current) =>
        current.phase === 'running' ? { ...current, current: message.current, total: message.total } : current,
      )
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
      clearInterval(timer.current)
    }
  }, [])

  const start = useCallback(
    (mode: RunMode, urls?: string[]): Promise<boolean> => {
      if (busy.current) return Promise.resolve(false)
      busy.current = true
      return new Promise<boolean>((resolve) => {
        const finish = (ok: boolean) => {
          busy.current = false
          settle.current = null
          setRun({ phase: 'idle' })
          resolve(ok)
        }
        const go = () => {
          if (mode !== 'menu') setShots((count) => count + 1)
          setRun({ phase: 'running', mode, current: 0, total: urls?.length ?? 0 })
          execute(mode, urls).then(finish, () => finish(false))
        }
        if (delaySec <= 0 || !usesCountdown(mode)) {
          go()
          return
        }
        const endsAt = Date.now() + delaySec * 1000
        settle.current = finish
        setRun({ phase: 'countdown', mode, remaining: delaySec, total: delaySec })
        timer.current = setInterval(() => {
          const remaining = Math.ceil((endsAt - Date.now()) / 1000)
          if (remaining > 0) {
            setRun((current) => (current.phase === 'countdown' ? { ...current, remaining } : current))
            return
          }
          clearInterval(timer.current)
          timer.current = undefined
          settle.current = null
          go()
        }, TICK_MS)
      })
    },
    [delaySec],
  )

  const cancel = useCallback(() => {
    if (!timer.current) return
    clearInterval(timer.current)
    timer.current = undefined
    settle.current?.(false)
  }, [])

  return { run, shots, start, cancel }
}
