import { ChevronRightIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Link } from '@/app/router'

interface SectionHeaderProps {
  title: string
  icon?: LucideIcon
  action?: { to: string; label: string }
  count?: number
  /** Extra controls placed before the action link. */
  controls?: ReactNode
}

export function SectionHeader({ title, icon: Icon, action, count, controls }: SectionHeaderProps) {
  return (
    <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />}
        <span className="truncate">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tracking-normal text-muted-foreground tabular-nums">
            {count}
          </span>
        )}
      </h2>
      {(controls || action) && (
        <div className="flex shrink-0 items-center gap-1">
          {controls}
          {action && (
            <Link
              to={action.to}
              className="flex min-h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-xs font-medium text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {action.label}
              <ChevronRightIcon className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
