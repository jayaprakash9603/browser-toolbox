import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { CircleDashedIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { HEALTH_ORDER, reasonPhrase, type EntryState, type LinkHealth } from '@/core/engines/linkChecker/report'
import { cn } from '@/shared/utils/cn'

import { HEALTH_META } from './meta'

/** Square status icon that leads every result row, so categories line up in one column. */
export function HealthTile({ state, size = 'md' }: { state: EntryState; size?: 'sm' | 'md' }) {
  const reduce = useReducedMotion()
  const box = size === 'sm' ? 'size-6 rounded-md [&_svg]:size-3.5' : 'size-8 rounded-lg [&_svg]:size-4'
  if (state.phase !== 'done') {
    return (
      <span className={cn('flex shrink-0 items-center justify-center bg-muted text-muted-foreground', box)} aria-hidden>
        {state.phase === 'checking' ? <Loader2Icon className="animate-spin motion-reduce:animate-none" /> : <CircleDashedIcon />}
      </span>
    )
  }
  const meta = HEALTH_META[state.health]
  const Icon = meta.icon
  return (
    <motion.span
      key={state.health}
      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      className={cn('flex shrink-0 items-center justify-center', box, meta.soft, meta.text)}
      aria-hidden
    >
      <Icon />
    </motion.span>
  )
}

export function StatusPill({ state }: { state: EntryState }) {
  const { t } = useTranslation()
  if (state.phase !== 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
        {state.phase === 'checking' ? t('linkChecker.checking') : t('linkChecker.queued')}
      </span>
    )
  }
  const { result, health } = state
  const meta = HEALTH_META[health]
  const label =
    result.status != null ? `${result.status} ${reasonPhrase(result.status)}`.trim() : t(`linkChecker.health.${health}`)
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums', meta.soft, meta.text)}
      title={result.error}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', meta.solid)} aria-hidden />
      {label}
    </span>
  )
}

export function Tag({
  children,
  tone = 'neutral',
  title,
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'info' | 'warning'
  title?: string
  className?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1 rounded px-1.5 py-px text-[10px] font-medium whitespace-nowrap [&_svg]:size-2.5 [&_svg]:shrink-0',
        tone === 'neutral' && 'bg-muted text-muted-foreground',
        tone === 'info' && 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
        tone === 'warning' && 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Animates a number from its previous value; renders the final value at once with reduced motion. */
export function CountUp({ value, format = (n: number) => n.toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    if (reduce) return undefined
    const controls = animate(shown.current, value, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        shown.current = latest
        setDisplay(Math.round(latest))
      },
    })
    return () => controls.stop()
  }, [value, reduce])

  return <>{format(reduce ? value : display)}</>
}

interface RingProps {
  /** 0 to 1. */
  value: number
  size?: number
  stroke?: number
  className?: string
  trackClassName?: string
  /** A slow dashed orbit around the ring, for work in progress. */
  orbit?: boolean
  children?: ReactNode
  label?: string
}

export function Ring({ value, size = 76, stroke = 7, className, trackClassName, orbit, children, label }: RingProps) {
  const reduce = useReducedMotion()
  const radius = (size - stroke) / 2
  const center = size / 2
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {orbit && !reduce && (
        <motion.span
          className="absolute -inset-1.5 rounded-full border border-dashed border-primary/35"
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        />
      )}
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} className={cn('stroke-muted', trackClassName)} />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={className}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, Math.min(1, value)) }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/** Stacked bar of result categories, in severity order. */
export function BreakdownBar({
  counts,
  total,
  active,
  className,
}: {
  counts: Record<LinkHealth, number>
  total: number
  active?: LinkHealth | null
  className?: string
}) {
  const reduce = useReducedMotion()
  const segments = HEALTH_ORDER.filter((health) => counts[health] > 0)
  return (
    <div className={cn('flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted', className)} aria-hidden>
      {segments.map((health, index) => (
        <motion.span
          key={health}
          className={cn(
            'h-full min-w-1 first:rounded-l-full last:rounded-r-full transition-opacity duration-200',
            HEALTH_META[health].solid,
            active && active !== health && 'opacity-25',
          )}
          initial={reduce ? false : { flexGrow: 0 }}
          animate={{ flexGrow: total > 0 ? counts[health] / total : 0 }}
          transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          style={{ flexBasis: 0 }}
        />
      ))}
    </div>
  )
}
