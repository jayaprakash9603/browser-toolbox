import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/shared/components/ui/skeleton'

type Variant = 'panel' | 'install'

export function ScriptStudioLoadingSkeleton({ variant }: { variant: Variant }) {
  const { t } = useTranslation()
  const label = t('nav.loading')

  if (variant === 'install') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="mx-auto w-full max-w-2xl space-y-4">
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
      <div className="flex items-center gap-3 rounded-xl border px-3 py-2" aria-hidden>
        <Skeleton className="h-5 w-9 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="ms-auto h-8 w-24 rounded-md" />
      </div>
      <div className="flex gap-4 border-b pb-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-16 rounded-md" />
        ))}
      </div>
      <div className="space-y-1.5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
