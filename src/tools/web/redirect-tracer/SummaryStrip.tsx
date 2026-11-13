import { useTranslation } from 'react-i18next'

import type { RedirectSummary } from '@/core/engines/redirects/chain'
import { cn } from '@/shared/utils/cn'

import { RT_STAT } from './layout'

const STATS = ['scanned', 'redirects', 'loops', 'direct'] as const

export function SummaryStrip({ summary }: { summary: RedirectSummary }) {
  const { t } = useTranslation()
  return (
    <div role="group" aria-label={t('redirectTracer.summary')} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {STATS.map((key) => (
        <div key={key} className={RT_STAT}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t(`redirectTracer.stat.${key}`)}
          </p>
          <p
            className={cn(
              'mt-1 text-lg font-semibold tabular-nums leading-none',
              key === 'redirects' && summary.redirects > 0 && 'text-sky-700 dark:text-sky-400',
              key === 'loops' && summary.loops > 0 && 'text-fuchsia-700 dark:text-fuchsia-400',
            )}
          >
            {summary[key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}
