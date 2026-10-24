import type { ReactNode } from 'react'
import { CircleAlertIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export function EmptyHint({ icon: Icon, children }: { icon: typeof CircleAlertIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-4 text-[13px] text-muted-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" aria-hidden />
      </span>
      <span>{children}</span>
    </div>
  )
}

export function FieldLabel({
  label,
  children,
  className,
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function Chip({
  children,
  onClick,
  active,
  title,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] [&_svg]:size-3.5',
        active && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

export function StatPill({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-md bg-muted/60 px-2.5 py-1.5">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}
