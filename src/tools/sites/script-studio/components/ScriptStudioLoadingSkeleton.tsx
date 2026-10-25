import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/shared/components/ui/skeleton'

type Variant = 'panel' | 'dashboard' | 'install'

export function ScriptStudioLoadingSkeleton({ variant }: { variant: Variant }) {
  const { t } = useTranslation()
  const label = t('nav.loading')

  if (variant === 'dashboard') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="flex min-h-screen bg-background">
        <span className="sr-only">{label}</span>
        <nav className="flex w-52 shrink-0 flex-col gap-2 border-r p-3" aria-hidden>
          <div className="mb-4 flex items-center gap-2 px-2">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
          <Skeleton className="mt-4 h-9 w-full rounded-md" />
        </nav>
        <main className="min-w-0 flex-1 space-y-4 p-6" aria-hidden>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-9 w-full max-w-md rounded-md" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (variant === 'install') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="mx-auto max-w-2xl space-y-4">
        <span className="sr-only">{label}</span>
        <Skeleton className="h-7 w-40" aria-hidden />
        <div className="space-y-3 rounded-xl border p-4" aria-hidden>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-2 h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-2" aria-hidden>
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      <div className="space-y-1" aria-hidden>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full max-w-xs" />
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-1" aria-hidden>
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" aria-hidden />
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex gap-2" aria-hidden>
        <Skeleton className="h-11 flex-1 rounded-md" />
        <Skeleton className="h-11 flex-1 rounded-md" />
      </div>
    </div>
  )
}
