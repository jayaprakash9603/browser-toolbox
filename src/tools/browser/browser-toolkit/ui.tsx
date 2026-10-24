import type { ReactNode } from 'react'
import { CheckIcon, LoaderCircleIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { cn } from '@/shared/utils/cn'

import type { FeedbackStatus } from './useActionFeedback'

type Accent = 'primary' | 'sky' | 'violet' | 'amber' | 'emerald' | 'rose'

const ACCENT: Record<Accent, { chip: string; pressed: string }> = {
  primary: { chip: 'bg-primary/10 text-primary', pressed: 'border-primary/40 bg-primary/[0.07]' },
  sky: {
    chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    pressed: 'border-sky-500/40 bg-sky-500/[0.07]',
  },
  violet: {
    chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    pressed: 'border-violet-500/40 bg-violet-500/[0.07]',
  },
  amber: {
    chip: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    pressed: 'border-amber-500/40 bg-amber-500/[0.07]',
  },
  emerald: {
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    pressed: 'border-emerald-500/40 bg-emerald-500/[0.07]',
  },
  rose: {
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    pressed: 'border-rose-500/40 bg-rose-500/[0.07]',
  },
}

export function Section({
  title,
  meta,
  children,
  className,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col gap-2', className)} aria-label={title}>
      <header className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{title}</h2>
        {meta}
      </header>
      {children}
    </section>
  )
}

function StatusIcon({ icon: Icon, status, className }: { icon: LucideIcon; status?: FeedbackStatus; className?: string }) {
  const reduce = useReducedMotion()
  const key = status ?? 'idle'
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={key}
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduce ? undefined : { scale: 0.6, opacity: 0, transition: { duration: 0.08 } }}
        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        className={cn('flex items-center justify-center', className)}
      >
        {status === 'busy' ? (
          <LoaderCircleIcon className={cn('size-full', !reduce && 'animate-spin')} aria-hidden />
        ) : status === 'done' ? (
          <CheckIcon className="size-full text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : status === 'error' ? (
          <TriangleAlertIcon className="size-full text-destructive" aria-hidden />
        ) : (
          <Icon className="size-full" aria-hidden />
        )}
      </motion.span>
    </AnimatePresence>
  )
}

interface ActionTileProps {
  icon: LucideIcon
  label: string
  /** Second line on tiles; tooltip on rows. */
  hint?: string
  onClick: () => void
  status?: FeedbackStatus
  /** Present only on toggle actions. */
  pressed?: boolean
  disabled?: boolean
  layout?: 'row' | 'tile'
  accent?: Accent
  badge?: ReactNode
  className?: string
}

export function ActionTile({
  icon,
  label,
  hint,
  onClick,
  status,
  pressed,
  disabled,
  layout = 'row',
  accent = 'primary',
  badge,
  className,
}: ActionTileProps) {
  const tone = ACCENT[accent]
  const base =
    'group relative flex min-w-0 rounded-xl border bg-card text-left shadow-xs outline-none transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-foreground/15 hover:bg-accent/50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === 'busy'}
      aria-pressed={pressed}
      aria-busy={status === 'busy' || undefined}
      title={layout === 'row' ? hint : undefined}
      className={cn(
        base,
        layout === 'row' ? 'h-10 items-center gap-2.5 px-2' : 'min-h-[78px] flex-col items-start gap-2 p-2.5',
        pressed && tone.pressed,
        className,
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center transition-colors',
          layout === 'row' ? 'size-6 rounded-md p-[5px]' : 'size-8 rounded-lg p-[7px]',
          tone.chip,
          pressed && 'ring-1 ring-current/25',
        )}
      >
        <StatusIcon icon={icon} status={status} className="size-full" />
      </span>
      <span className={cn('flex min-w-0 flex-col', layout === 'row' && 'flex-1')}>
        <span className="truncate text-[13px] leading-tight font-medium">{label}</span>
        {layout === 'tile' && hint && (
          <span className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">{hint}</span>
        )}
      </span>
      {badge && (
        <span className={cn('shrink-0', layout === 'tile' && 'absolute top-2 right-2')}>{badge}</span>
      )}
    </button>
  )
}

export function Chip({
  icon: Icon,
  children,
  tone = 'muted',
}: {
  icon?: LucideIcon
  children: ReactNode
  tone?: 'muted' | 'ok' | 'warn' | 'info' | 'violet'
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap',
        tone === 'muted' && 'bg-muted/60 text-muted-foreground',
        tone === 'ok' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        tone === 'warn' && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        tone === 'info' && 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
        tone === 'violet' && 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  )
}
