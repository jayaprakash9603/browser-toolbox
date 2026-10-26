import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { Toaster } from './Toaster'
import { ToastContext, type ToastApi, type ToastOptions, type ToastState } from './useToast'

/** Single app-wide toast host: every tool shows feedback through `useToast()` so popups look and behave the same. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
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
    setToast(next)
  }, [])

  const undoCurrent = useCallback(() => {
    const undo = current.current?.undo
    if (!undo) return false
    undo()
    dismiss()
    return true
  }, [dismiss])

  const api = useMemo<ToastApi>(() => ({ show, dismiss, undoCurrent }), [show, dismiss, undoCurrent])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
