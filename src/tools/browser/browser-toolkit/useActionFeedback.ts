import { useCallback, useEffect, useRef, useState } from 'react'

export type FeedbackStatus = 'busy' | 'done' | 'error'

/** Per-action busy/done/error flash plus one polite announcement for screen readers. */
export function useActionFeedback(errorFallback: string) {
  const [state, setState] = useState<Record<string, FeedbackStatus>>({})
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const run = useCallback(
    async (key: string, action: () => unknown, success?: string) => {
      clearTimeout(timers.current.get(key))
      setState((s) => ({ ...s, [key]: 'busy' }))
      let status: FeedbackStatus = 'done'
      try {
        await action()
        if (success) setMessage({ text: success, tone: 'ok' })
      } catch (error) {
        status = 'error'
        const text = error instanceof Error && error.message ? error.message : errorFallback
        setMessage({ text, tone: 'error' })
      }
      setState((s) => ({ ...s, [key]: status }))
      timers.current.set(
        key,
        setTimeout(() => {
          setState(({ [key]: _done, ...rest }) => rest)
        }, status === 'error' ? 2400 : 1400),
      )
    },
    [errorFallback],
  )

  return { status: (key: string) => state[key], run, message }
}
