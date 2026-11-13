import { useTranslation } from 'react-i18next'

import type { HistoryManagerTab } from '@/core/history-manager'
import { Skeleton } from '@/shared/components/ui/skeleton'

import { HM_CHART_SHELL } from './layout'

const DAY_BAR_HEIGHTS = [38, 72, 24, 88, 42, 56, 18, 64, 22, 34, 28, 48, 16, 80]
const HOUR_BAR_HEIGHTS = [22, 18, 14, 12, 16, 28, 46, 62, 70, 54, 48, 40, 58, 66, 52, 44, 60, 78, 64, 42, 36, 30, 24, 20]
const DOMAIN_WIDTHS = [72, 54, 46, 38, 30, 22]

function ChartBarsSkeleton({ height, bars }: { height: string; bars: readonly number[] }) {
  return (
    <div className={HM_CHART_SHELL} aria-hidden>
      <Skeleton className="mb-2.5 h-2.5 w-28" />
      <div className={`flex items-end gap-1 ${height}`}>
        {bars.map((barHeight, index) => (
          <Skeleton key={index} className="min-w-0 flex-1 rounded-t-md" style={{ height: `${barHeight}%` }} />
        ))}
      </div>
    </div>
  )
}

export function InsightsSkeleton({ withNote = false }: { withNote?: boolean }) {
  const { t } = useTranslation()
  const label = t('historyManager.loading')

  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      {withNote ? <Skeleton className="h-3 w-4/5 max-w-md" /> : null}
      <ChartBarsSkeleton height="h-[148px]" bars={DAY_BAR_HEIGHTS} />
      <ChartBarsSkeleton height="h-[132px]" bars={HOUR_BAR_HEIGHTS} />
      <div className={HM_CHART_SHELL} aria-hidden>
        <Skeleton className="mb-2.5 h-2.5 w-24" />
        <ul className="flex flex-col gap-2.5">
          {DOMAIN_WIDTHS.map((width, index) => (
            <li key={index} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(4.5rem,6rem)_minmax(2.75rem,3.5rem)] items-center gap-x-2.5">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-3 w-28 max-w-full" />
              <Skeleton className="h-2 rounded-full" style={{ width: `${width}%` }} />
              <Skeleton className="ml-auto h-3 w-8" />
            </li>
          ))}
        </ul>
      </div>
      <div className={HM_CHART_SHELL} aria-hidden>
        <Skeleton className="mb-2.5 h-2.5 w-20" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="grid grid-cols-2 gap-2.5 @xs:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="min-h-[4.5rem] rounded-xl" />
        ))}
        <Skeleton className="col-span-2 min-h-[4.5rem] rounded-xl @xs:col-span-3" />
      </div>
      <ChartBarsSkeleton height="h-[128px]" bars={DAY_BAR_HEIGHTS} />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="mb-1 h-2.5 w-20" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 rounded-xl" />
      ))}
    </div>
  )
}

function SitesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className={HM_CHART_SHELL}>
        <Skeleton className="mb-2.5 h-2.5 w-24" />
        <ul className="flex flex-col gap-2.5">
          {DOMAIN_WIDTHS.map((width, index) => (
            <li key={index} className="flex items-center gap-2.5">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-3 w-32 max-w-[40%]" />
              <Skeleton className="ml-auto h-2 flex-1 rounded-full" style={{ maxWidth: `${width}%` }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function HistoryTabSkeleton({ tab }: { tab: HistoryManagerTab }) {
  const { t } = useTranslation()
  const label = t('historyManager.loading')

  if (tab === 'insights') return <InsightsSkeleton withNote />

  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      {tab === 'overview' ? (
        <OverviewSkeleton />
      ) : tab === 'sites' ? (
        <SitesSkeleton />
      ) : tab === 'closed' ? (
        <ListSkeleton rows={4} />
      ) : (
        <ListSkeleton rows={8} />
      )}
    </div>
  )
}
