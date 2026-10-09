import { ChevronRightIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Link } from '@/app/router'

interface SectionHeaderProps {
  title: string
  icon?: LucideIcon
  action?: { to: string; label: string }
  count?: number
}

export function SectionHeader({ title, icon: Icon, action, count }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
        )}
        <h2 className="text-section-title flex items-center gap-1.5">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {action.label}
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  )
}
