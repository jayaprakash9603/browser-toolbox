import { createContext, useContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastState {
  id: number
  message: string
  variant: ToastVariant
  undo?: () => void
}

export interface ToastOptions {
  /** Shows an Undo button; invoked once when the user clicks it. */
  undo?: () => void
  variant?: ToastVariant
}

export interface ToastApi {
  /** Shows a toast, replacing the one on screen. */
  show: (message: string, options?: ToastOptions) => void
  dismiss: () => void
  /** Runs the visible toast's undo (if any) and dismisses it. Returns whether something was undone. */
  undoCurrent: () => boolean
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
