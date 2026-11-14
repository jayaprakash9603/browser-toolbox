import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export function toneClass(tone: 'success' | 'warning' | 'danger' | 'info' | 'muted'): string {
  if (tone === 'success') return 'text-[var(--success)]'
  if (tone === 'warning') return 'text-[var(--warning)]'
  if (tone === 'danger') return 'text-destructive'
  if (tone === 'info') return 'text-primary'
  return 'text-muted-foreground'
}

export function resultTone(result: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  if (result === 'passed' || result === 'granted') return 'success'
  if (result === 'warning' || result === 'prompt') return 'warning'
  if (result === 'failed' || result === 'denied' || result === 'critical') return 'danger'
  if (result === 'not_available' || result === 'not_checked') return 'muted'
  return 'info'
}

export function StatusBadge({
  label,
  tone = 'info',
  pulse,
}: {
  label: string
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'muted'
  pulse?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide',
        toneClass(tone),
      )}
    >
      {pulse ? (
        <span className={cn('size-1.5 rounded-full', tone === 'success' ? 'bg-[var(--success)]' : 'bg-primary')} />
      ) : null}
      {label}
    </span>
  )
}

export function ScoreRing({ score, size = 128 }: { score: number | null; size?: number }) {
  const radius = 50
  const circ = 2 * Math.PI * radius
  const offset = score == null ? circ : circ * (1 - Math.min(100, Math.max(0, score)) / 100)
  const tone = score == null ? 'text-muted-foreground' : score >= 75 ? 'text-[var(--success)]' : score >= 50 ? 'text-primary' : 'text-destructive'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          className={cn('transition-[stroke-dashoffset] duration-700', tone)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-semibold tabular-nums">{score ?? '—'}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

export function Panel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border bg-card p-3 shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function CapsLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'info',
  icon,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'muted'
  icon?: ReactNode
}) {
  return (
    <Panel className="flex min-h-[5.5rem] flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <CapsLabel>{label}</CapsLabel>
        {icon}
      </div>
      <StatusBadge label={value} tone={tone} />
      {hint ? <p className="truncate font-mono text-[11px] text-muted-foreground">{hint}</p> : null}
    </Panel>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>
}

export function FindingRow({
  name,
  result,
  evidence,
  recommendation,
}: {
  name: string
  result: string
  evidence?: string
  recommendation?: string
}) {
  return (
    <details className="rounded-lg border bg-background/60 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
        <span>{name}</span>
        <StatusBadge label={result.replaceAll('_', ' ')} tone={resultTone(result)} />
      </summary>
      <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
        {evidence ? <p>{evidence}</p> : null}
        {recommendation ? <p>{recommendation}</p> : null}
      </div>
    </details>
  )
}

export function BarRow({ label, value, icon }: { label: string; value: number | null; icon?: ReactNode }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value))
  const tone = value == null ? 'bg-muted-foreground' : value >= 80 ? 'bg-[var(--success)]' : value >= 50 ? 'bg-primary' : 'bg-destructive'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-semibold tabular-nums">{value == null ? '—' : `${value}%`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
