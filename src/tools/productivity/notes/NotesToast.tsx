import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { XIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

export interface NotesToastAction {
  label: string
  run: () => void
  /** Marks the action as an undo, so Ctrl+Z can trigger it. */
  undo?: boolean
}

interface ToastState {
  id: number
  message: string
  action?: NotesToastAction
}

const DURATION_MS = 5000

export function useNotesToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const seq = useRef(0)
  const current = useRef<ToastState | null>(null)

  const clear = () => window.clearTimeout(timer.current)

  const dismiss = useCallback(() => {
    clear()
    current.current = null
    setToast(null)
  }, [])

  const resume = useCallback(() => {
    clear()
    timer.current = window.setTimeout(dismiss, DURATION_MS)
  }, [dismiss])

  const show = useCallback(
    (message: string, action?: NotesToastAction) => {
      seq.current += 1
      const next = { id: seq.current, message, action }
      current.current = next
      setToast(next)
      resume()
    },
    [resume],
  )

  /** Runs the visible toast's action. Returns false when there is nothing (or no undo) to run. */
  const runAction = useCallback(
    (undoOnly = false) => {
      const action = current.current?.action
      if (!action || (undoOnly && !action.undo)) return false
      dismiss()
      action.run()
      return true
    },
    [dismiss],
  )

  useEffect(() => clear, [])

  return useMemo(() => ({ toast, show, dismiss, runAction, pause: clear, resume }), [toast, show, dismiss, runAction, resume])
}

export type NotesToastApi = ReturnType<typeof useNotesToast>

export function NotesToast({ api }: { api: NotesToastApi }) {
  const { t } = useTranslation()
  const { toast } = api
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-12 z-30 flex justify-center px-3" role="status" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            onPointerEnter={api.pause}
            onPointerLeave={api.resume}
            onFocus={api.pause}
            onBlur={api.resume}
            className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl border bg-popover py-1 pr-1 pl-3.5 text-[13px] text-popover-foreground shadow-lg"
          >
            <span className="min-w-0 truncate py-1">{toast.message}</span>
            {toast.action && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 font-semibold text-primary hover:text-primary"
                onClick={() => api.runAction()}
              >
                {toast.action.label}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 shrink-0 text-muted-foreground"
              aria-label={t('notes.toast.dismiss')}
              onClick={api.dismiss}
            >
              <XIcon />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
