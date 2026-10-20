import type { LucideIcon } from 'lucide-react'
import { ShieldCheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils/cn'

export function ProtectionInterstitial({
  icon: Icon,
  tone = 'warning',
  badge,
  title,
  description,
  details,
  tips,
  actions,
  compact = false,
}: {
  icon: LucideIcon
  tone?: 'danger' | 'warning'
  badge?: string
  title: string
  description: string
  details?: ReactNode
  tips?: string[]
  actions: ReactNode
  /** Tighter layout for the download confirmation popup (~460×420). */
  compact?: boolean
}) {
  const iconWrap =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive ring-destructive/20'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/25'

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-gradient-to-b from-muted/40 to-background text-foreground',
        compact ? 'px-4 py-5' : 'px-4 py-8',
      )}
    >
      <header className="mb-4 flex items-center gap-2 text-muted-foreground">
        <ShieldCheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="text-[11px] font-medium tracking-wide uppercase">Browser Toolbox</span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div
          className={cn(
            'rounded-2xl border bg-card shadow-md ring-1 ring-border/60',
            compact ? 'p-4' : 'p-6',
          )}
        >
          <div className="mb-4 flex flex-col items-center text-center sm:items-start sm:text-left">
            <div
              className={cn(
                'mb-3 flex size-12 items-center justify-center rounded-full ring-4',
                iconWrap,
              )}
            >
              <Icon className="size-6" strokeWidth={2} aria-hidden />
            </div>
            {badge && (
              <Badge variant="secondary" className="mb-2 w-fit text-[10px] font-semibold uppercase tracking-wide">
                {badge}
              </Badge>
            )}
            <h1 className={cn('font-semibold leading-snug', compact ? 'text-base' : 'text-lg')}>{title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {details && (
            <div className="mb-4 space-y-2 rounded-xl border border-dashed bg-muted/40 p-3">{details}</div>
          )}

          {tips && tips.length > 0 && (
            <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2 leading-snug">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2">{actions}</div>
        </div>
      </main>
    </div>
  )
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all font-mono text-xs text-foreground">{value}</p>
    </div>
  )
}
