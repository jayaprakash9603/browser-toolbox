import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2Icon } from 'lucide-react'

import type { SeoReport } from '@/core/engines/seo/types'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { Stat } from '../components'
import { PageSpeedSkeleton } from '../SeoLoadingSkeleton'
import { fetchPageSpeedInsights, type PageSpeedResult } from '../pagespeed'

export function PerformanceTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const [psi, setPsi] = useState<PageSpeedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { page, network } = report

  const runPsi = async () => {
    setLoading(true)
    setPsi(null)
    const result = await fetchPageSpeedInsights(page.url)
    setPsi(result)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium">{t('seo.localTimings')}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {page.performance.ttfb != null && (
          <Stat label="TTFB" value={`${Math.round(page.performance.ttfb)} ms`} />
        )}
        {page.performance.domContentLoaded != null && (
          <Stat
            label="DCL"
            value={`${Math.round(page.performance.domContentLoaded)} ms`}
          />
        )}
        {page.performance.loadEvent != null && (
          <Stat label="Load" value={`${Math.round(page.performance.loadEvent)} ms`} />
        )}
        {network.contentLength != null && (
          <Stat label={t('seo.responseSize')} value={`${Math.round(network.contentLength / 1024)} KB`} />
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-[11px]"
        disabled={loading}
        onClick={() => void runPsi()}
      >
        {loading ? (
          <>
            <Loader2Icon className="size-3.5 motion-safe:animate-spin" aria-hidden />
            {t('seo.runningPsi')}
          </>
        ) : (
          t('seo.runPageSpeed')
        )}
      </Button>
      {loading && <PageSpeedSkeleton />}
      {psi?.error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
          {psi.error}
        </p>
      )}
      {!loading && psi && (psi.mobile || psi.desktop) && (
        <div
          className="grid grid-cols-2 gap-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none"
        >
          <PsiCard title={t('seo.mobile')} data={psi.mobile} />
          <PsiCard title={t('seo.desktop')} data={psi.desktop} />
        </div>
      )}
      {!loading && psi?.mobile?.opportunities && psi.mobile.opportunities.length > 0 && (
        <div className="rounded-lg border bg-card/40 p-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:animate-none">
          <p className="mb-1.5 text-[11px] font-medium">{t('seo.opportunities')}</p>
          <ul className="list-inside list-disc space-y-0.5 text-[10px] text-muted-foreground">
            {psi.mobile.opportunities.map((o) => (
              <li key={o.title}>{o.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PsiCard({
  title,
  data,
}: {
  title: string
  data: PageSpeedResult['mobile']
}) {
  if (!data) return null
  const score = data.score ?? null
  const tone =
    score == null
      ? 'text-foreground'
      : score >= 90
        ? 'text-green-600 dark:text-green-400'
        : score >= 50
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-lg border bg-card/50 p-3 text-center motion-safe:transition-colors motion-safe:duration-200 hover:bg-muted/20">
      <p className="text-[11px] font-medium">{title}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', tone)}>
        {score ?? '—'}
      </p>
      <div className="mt-2 space-y-0.5 text-[9px] text-muted-foreground">
        {data.lcp && <p>LCP {data.lcp}</p>}
        {data.cls && <p>CLS {data.cls}</p>}
        {data.inp && <p>INP {data.inp}</p>}
      </div>
    </div>
  )
}
