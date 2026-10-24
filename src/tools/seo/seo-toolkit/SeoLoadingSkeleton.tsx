import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/shared/components/ui/skeleton'

const STAGGER = ['delay-0', 'delay-75', 'delay-150', 'delay-200'] as const

export function SeoReportSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-col gap-3"
      role="status"
      aria-busy="true"
      aria-label={t('nav.loading')}
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>

      <div className="flex gap-1.5 overflow-hidden pb-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-[4.5rem] shrink-0 rounded-md" />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        {STAGGER.map((delay, i) => (
          <Skeleton key={i} className={`h-14 w-full rounded-lg ${delay}`} />
        ))}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function PageSpeedSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="status"
      aria-busy="true"
      aria-label={t('seo.runningPsi')}
    >
      {['mobile', 'desktop'].map((side) => (
        <div key={side} className="space-y-2 rounded-lg border bg-card/40 p-3">
          <Skeleton className="mx-auto h-3 w-14" />
          <Skeleton className="mx-auto h-9 w-12 rounded-md" />
          <Skeleton className="mx-auto h-2.5 w-20" />
          <Skeleton className="mx-auto h-2.5 w-16" />
        </div>
      ))}
    </div>
  )
}
