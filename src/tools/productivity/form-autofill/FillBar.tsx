import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  BookmarkCheckIcon,
  BrushCleaningIcon,
  CircleSlashIcon,
  KeyRoundIcon,
  Loader2Icon,
  SparklesIcon,
  WandSparklesIcon,
} from 'lucide-react'

import type { FormActionResult } from '@/core/form-memory/model'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

export type FillBarAction = 'fill' | 'clear'

interface FillBarProps {
  info: FormActionResult | null
  /** Saved profile answers the SDK can put into this page. */
  profileCount: number
  busy: FillBarAction | 'access' | null
  shortcut: Record<FillBarAction, string>
  onAction: (action: FillBarAction) => void
  onAllowAccess: () => void
}

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).host : ''
  } catch {
    return ''
  }
}

/**
 * The single action under the field list. It fills when the form is empty and clears once it holds
 * values, so one button (and one shortcut pair) covers the whole flow.
 */
export function FillBar({ info, profileCount, busy, shortcut, onAction, onAllowAccess }: FillBarProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const reason = info?.reason
  const unavailable = !info || reason === 'no-tab' || reason === 'restricted'
  const needsAccess = reason === 'no-access'
  const action: FillBarAction = info && info.populated > 0 ? 'clear' : 'fill'
  const host = hostOf(info?.url)

  const status = (() => {
    if (!info) return { icon: Loader2Icon, text: t('formMemory.bar.checking'), spin: true }
    if (reason === 'no-tab' || reason === 'restricted') return { icon: CircleSlashIcon, text: t('formMemory.bar.restricted') }
    if (needsAccess) return { icon: KeyRoundIcon, text: t('formMemory.bar.needsAccess', { host }) }
    if (reason === 'blocked') return { icon: CircleSlashIcon, text: t('formMemory.bar.blocked', { host }) }
    if (info.saved > 0) {
      return {
        icon: BookmarkCheckIcon,
        text: t('formMemory.bar.saved', { count: info.saved }),
        tone: 'text-emerald-700 dark:text-emerald-300',
      }
    }
    if (profileCount > 0) return { icon: SparklesIcon, text: t('formMemory.bar.profile', { count: profileCount }) }
    return {
      icon: SparklesIcon,
      text: info.learn ? t('formMemory.bar.learning') : t('formMemory.bar.learningOff'),
    }
  })()
  const StatusIcon = status.icon

  const label = action === 'clear' ? t('formMemory.bar.clear') : t('formMemory.bar.fill')
  const Icon = action === 'clear' ? BrushCleaningIcon : WandSparklesIcon
  const working = busy === action

  return (
    <div className="shrink-0 border-t bg-card px-3 pt-2 pb-3 shadow-[0_-6px_16px_-12px_rgb(0_0_0/0.35)]">
      <p
        className={cn('mb-2 flex min-h-4 items-center gap-1.5 text-xs leading-4 text-muted-foreground', status.tone)}
        aria-live="polite"
      >
        <StatusIcon className={cn('size-3.5 shrink-0', status.spin && 'motion-safe:animate-spin')} aria-hidden />
        <span className="min-w-0 truncate">{status.text}</span>
      </p>
      {needsAccess ? (
        <Button className="h-11 w-full text-sm" onClick={onAllowAccess} disabled={busy === 'access'}>
          <KeyRoundIcon aria-hidden />
          {t('formMemory.bar.allow')}
        </Button>
      ) : (
        <Button
          variant={action === 'clear' ? 'outline' : 'default'}
          className="relative h-11 w-full overflow-hidden text-sm"
          onClick={() => onAction(action)}
          disabled={unavailable || busy != null}
          aria-keyshortcuts={shortcut[action] || undefined}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={action}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2"
            >
              {working ? (
                <Loader2Icon className="motion-safe:animate-spin" aria-hidden />
              ) : (
                <Icon aria-hidden />
              )}
              {label}
            </motion.span>
          </AnimatePresence>
          {shortcut[action] && (
            <kbd
              aria-hidden
              className={cn(
                'absolute right-3 hidden rounded border px-1.5 py-0.5 font-sans text-[10px] leading-none font-medium @[300px]:inline',
                action === 'clear'
                  ? 'border-border bg-muted text-muted-foreground'
                  : 'border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground/85',
              )}
            >
              {shortcut[action]}
            </kbd>
          )}
        </Button>
      )}
    </div>
  )
}
