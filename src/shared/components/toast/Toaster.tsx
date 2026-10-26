import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, Undo2Icon, XIcon } from 'lucide-react'

import type { ToastState, ToastVariant } from './useToast'

const TOAST_MS = 6000

const ICONS: Record<ToastVariant, { Icon: typeof CircleCheckIcon; className: string }> = {
  success: { Icon: CircleCheckIcon, className: 'text-emerald-400 dark:text-emerald-600' },
  error: { Icon: CircleAlertIcon, className: 'text-red-400 dark:text-red-600' },
  info: { Icon: InfoIcon, className: 'text-sky-400 dark:text-sky-600' },
}

interface ToasterProps {
  toast: ToastState | null
  onDismiss: () => void
}

export function Toaster({ toast, onDismiss }: ToasterProps) {
  const { t } = useTranslation()
  const id = toast?.id

  useEffect(() => {
    if (id == null) return
    const timer = setTimeout(onDismiss, TOAST_MS)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  const icon = toast ? ICONS[toast.variant] : null

  return (
    // z-[100] sits above dialogs, popovers and the command palette (z-50) so feedback is never hidden.
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[100] flex justify-center px-3">
      <AnimatePresence mode="popLayout">
        {toast && icon && (
          <motion.div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="pointer-events-auto relative flex max-w-sm min-w-0 items-center gap-2 overflow-hidden rounded-xl bg-foreground py-2 pr-1.5 pl-3 text-[12.5px] text-background shadow-lg"
          >
            <icon.Icon className={`size-4 shrink-0 ${icon.className}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.()
                  onDismiss()
                }}
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-background/10 px-2 font-semibold text-background outline-none transition-colors hover:bg-background/15 focus-visible:ring-2 focus-visible:ring-background/50"
                title={t('toast.undoHint')}
              >
                <Undo2Icon className="size-3.5" aria-hidden />
                {t('toast.undo')}
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t('toast.dismiss')}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-background/70 outline-none transition-colors hover:bg-background/15 hover:text-background focus-visible:ring-2 focus-visible:ring-background/50"
            >
              <XIcon className="size-3.5" />
            </button>
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-background/35"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: TOAST_MS / 1000, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
