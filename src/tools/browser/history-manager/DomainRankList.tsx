import { chartColor, type ChartToken } from '@/shared/chart/series'
import { SiteFavicon } from '@/shared/components/SiteFavicon'
import { cn } from '@/shared/utils/cn'

import { HM_CHART_SHELL, HM_SECTION_TITLE } from './layout'

interface DomainRankListProps {
  title: string
  rows: { domain: string; visits: number }[]
  barToken?: ChartToken
  showFavicon?: boolean
  className?: string
}

export function DomainRankList({
  title,
  rows,
  barToken = 4,
  showFavicon = true,
  className,
}: DomainRankListProps) {
  const max = Math.max(1, ...rows.map((row) => row.visits))
  const barColor = chartColor(barToken)

  return (
    <section className={cn(HM_CHART_SHELL, className)}>
      <p className={HM_SECTION_TITLE}>{title}</p>
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li
            key={row.domain}
            className="grid grid-cols-[auto_minmax(0,1fr)_minmax(4.5rem,6rem)_minmax(2.75rem,3.5rem)] items-center gap-x-2.5 text-sm"
          >
            {showFavicon ? (
              <SiteFavicon url={`https://${row.domain}`} />
            ) : (
              <span className="size-4" aria-hidden />
            )}
            <span className="min-w-0 truncate font-medium leading-none">{row.domain}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, Math.round((row.visits / max) * 100))}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
            <span className="text-right text-xs tabular-nums leading-none text-muted-foreground">
              {row.visits.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
