import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

interface ProductivityStatusBarProps {
  children: ReactNode
  className?: string
}

/** Aligned footer strip for productivity tools (counts, toasts, hints). */
export function ProductivityStatusBar({ children, className }: ProductivityStatusBarProps) {
  return (
    <div
      className={cn(
        'border-t bg-background/95 px-[var(--density-page-pad)] py-2 text-[10.5px] text-muted-foreground tabular-nums backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
