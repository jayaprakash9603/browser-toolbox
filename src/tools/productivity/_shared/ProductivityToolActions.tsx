import type { ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'

/** Horizontally aligned action chips shared across productivity tools. */
export function ProductivityToolActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-1.5', className)}>{children}</div>
}
