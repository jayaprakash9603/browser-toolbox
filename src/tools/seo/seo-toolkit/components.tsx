import type { ReactNode } from 'react'
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, InfoIcon } from 'lucide-react'

import type { SeoCheck, SeoSeverity } from '@/core/engines/seo/types'
import { Badge } from '@/shared/components/ui/badge'
import { CopyButton } from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'

const SEVERITY_BORDER: Record<SeoSeverity, string> = {
  ok: 'border-l-green-500/70',
  warning: 'border-l-amber-500/80',
  error: 'border-l-red-500/80',
  notice: 'border-l-muted-foreground/50',
}

export function SeverityIcon({ severity }: { severity: SeoSeverity }) {
  if (severity === 'ok')
    return <CheckCircle2Icon className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
  if (severity === 'warning')
    return <AlertTriangleIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
  if (severity === 'error')
    return <XCircleIcon className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
  return <InfoIcon className="size-3.5 shrink-0 text-muted-foreground" />
}

export function CheckRow({ check }: { check: SeoCheck }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-l-2 bg-card/40 p-2.5 motion-safe:transition-colors motion-safe:duration-200 hover:bg-muted/30',
        SEVERITY_BORDER[check.severity],
      )}
    >
      <SeverityIcon severity={check.severity} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-snug">{check.message}</p>
        {check.fix && <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{check.fix}</p>}
      </div>
    </div>
  )
}

export function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card/50 p-2.5 text-center motion-safe:transition-colors motion-safe:duration-200 hover:bg-muted/25',
        warn && 'border-amber-500/40 bg-amber-500/5',
      )}
    >
      <p className="text-sm font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function MetaRow({ label, value, maxLen }: { label: string; value?: string | null; maxLen?: number }) {
  if (!value) return null
  const len = value.length
  const over = maxLen != null && len > maxLen
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border bg-muted/30 px-2.5 py-2 motion-safe:transition-colors motion-safe:duration-200 hover:bg-muted/45">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {maxLen != null && (
            <Badge variant="outline" className={`text-[10px] ${over ? 'border-amber-500/50' : ''}`}>
              {len}/{maxLen}
            </Badge>
          )}
        </div>
        <p className="mt-1 break-words text-[11px] leading-relaxed">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  )
}

export function Pill({ children, variant }: { children: ReactNode; variant: 'ok' | 'warn' | 'bad' }) {
  const cls =
    variant === 'ok'
      ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400'
      : variant === 'warn'
        ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
        : 'border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-400'
  return (
    <Badge variant="outline" className={`text-[10px] ${cls}`}>
      {children}
    </Badge>
  )
}

const RING_RADIUS = 28
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function ScoreRing({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score))
  const offset = RING_CIRCUMFERENCE - (clamped / 100) * RING_CIRCUMFERENCE
  const stroke =
    clamped >= 80
      ? 'stroke-green-500'
      : clamped >= 50
        ? 'stroke-amber-500'
        : 'stroke-red-500'

  return (
    <div className="relative size-16 shrink-0" aria-hidden>
      <svg className="size-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          fill="none"
          className="stroke-muted"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          fill="none"
          className={cn(stroke, 'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out')}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums">
        {clamped}
      </span>
    </div>
  )
}

export const seoTabEnterClass =
  'mt-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-reduce:animate-none'
