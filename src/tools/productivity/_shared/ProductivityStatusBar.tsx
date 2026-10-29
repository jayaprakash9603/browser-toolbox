import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface ProductivityStatusBarProps {
  children: ReactNode
  trailing?: ReactNode
  className?: string
}

/** Aligned footer strip for productivity tools (counts, toasts, hints). */
export function ProductivityStatusBar({ children, trailing, className }: ProductivityStatusBarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 border-t bg-background/95 px-[var(--density-page-pad)] py-2 text-[11px] text-muted-foreground tabular-nums backdrop-blur-sm',
        className,
      )}
    >
      <div className="min-w-0 flex-1 truncate">{children}</div>
      {trailing ? <div className="flex shrink-0 items-center gap-1.5">{trailing}</div> : null}
    </div>
  )
}
