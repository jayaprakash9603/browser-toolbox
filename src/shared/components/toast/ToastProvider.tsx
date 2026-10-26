import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ToastContext, type ToastApi, type ToastOptions, type ToastState } from './useToast'

// The popup UI (motion, icons) loads on the first toast so it stays out of the startup bundle.
const Toaster = lazy(() => import('./Toaster').then((m) => ({ default: m.Toaster })))

/** Single app-wide toast host: every tool shows feedback through `useToast()` so popups look and behave the same. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [armed, setArmed] = useState(false)
  const current = useRef<ToastState | null>(null)
  const counter = useRef(0)

  const dismiss = useCallback(() => {
    current.current = null
    setToast(null)
  }, [])

  const show = useCallback((message: string, options?: ToastOptions) => {
    const next: ToastState = {
      id: ++counter.current,
      message,
      variant: options?.variant ?? 'success',
      undo: options?.undo,
    }
    current.current = next
    setArmed(true)
    setToast(next)
  }, [])

  const undoCurrent = useCallback(() => {
    const undo = current.current?.undo
    if (!undo) return false
    undo()
    dismiss()
    return true
  }, [dismiss])

  // Warm the chunk once the app is idle so the first toast appears instantly.
  useEffect(() => {
    const warm = () => void import('./Toaster')
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warm, { timeout: 4000 })
      return () => cancelIdleCallback(id)
    }
    const id = window.setTimeout(warm, 2000)
    return () => window.clearTimeout(id)
  }, [])

  const api = useMemo<ToastApi>(() => ({ show, dismiss, undoCurrent }), [show, dismiss, undoCurrent])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {armed && (
        <Suspense fallback={null}>
          <Toaster toast={toast} onDismiss={dismiss} />
        </Suspense>
      )}
    </ToastContext.Provider>
  )
}
