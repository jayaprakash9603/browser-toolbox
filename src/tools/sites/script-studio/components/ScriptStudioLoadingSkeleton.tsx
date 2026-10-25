import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/shared/components/ui/skeleton'

type Variant = 'panel' | 'dashboard' | 'install'

function WorkspaceSkeleton({ tabs, rows }: { tabs: number; rows: number }) {
  return (
    <>
      <div className="space-y-3 rounded-xl border p-4" aria-hidden>
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ms-auto h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="flex gap-4 border-b pb-2" aria-hidden>
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-16 rounded-md" />
        ))}
      </div>
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </>
  )
}

export function ScriptStudioLoadingSkeleton({ variant }: { variant: Variant }) {
  const { t } = useTranslation()
  const label = t('nav.loading')

  if (variant === 'dashboard') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="min-h-screen bg-background">
        <span className="sr-only">{label}</span>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:px-6 lg:py-8">
          <WorkspaceSkeleton tabs={6} rows={6} />
        </div>
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
      <WorkspaceSkeleton tabs={4} rows={3} />
    </div>
  )
}
