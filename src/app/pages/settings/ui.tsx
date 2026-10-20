import { ArrowRightIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Link } from '@/app/router'
import { cn } from '@/shared/utils/cn'

/** Grouped settings card: icon header + divided rows. */
export function SettingsGroup({
  id,
  icon: Icon,
  title,
  description,
  children,
  tone = 'default',
}: {
  id?: string
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section id={id} className="scroll-mt-16" aria-labelledby={id ? `${id}-title` : undefined}>
      <header className="mb-2 flex items-center gap-3 px-1">
        <span
          aria-hidden
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="text-sm leading-tight font-semibold">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
          )}
        </div>
      </header>
      <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border bg-card shadow-xs">
        {children}
      </div>
    </section>
  )
}

/** A single setting: label + hint on the left, control on the right. */
export function SettingsRow({
  searchId,
  label,
  description,
  children,
  stacked = false,
}: {
  searchId?: string
  label: string
  description?: string
  children: ReactNode
  /** Put the control under the text (wide controls such as palette pickers). */
  stacked?: boolean
}) {
  return (
    <div
      className={cn(
        'gap-3 px-4 py-3.5',
        stacked ? 'flex flex-col' : 'flex items-center justify-between gap-4',
      )}
      data-search-id={searchId}
    >
      <div className="min-w-0">
        <p className="text-[13px] leading-tight font-medium">{label}</p>
        {description && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn(!stacked && 'shrink-0')}>{children}</div>
    </div>
  )
}

/** Footer-style navigation row that jumps to the full tool. */
export function SettingsLinkRow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex min-h-11 items-center justify-between gap-2 bg-muted/30 px-4 py-2.5 text-xs font-medium text-primary outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span>{children}</span>
      <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
