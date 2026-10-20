import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SeoReport } from '@/core/engines/seo/types'
import { Button } from '@/shared/components/ui/button'
import { Stat } from '../components'
import { fetchPageSpeedInsights, type PageSpeedResult } from '../pagespeed'

export function PerformanceTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const [psi, setPsi] = useState<PageSpeedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { page, network } = report

  const runPsi = async () => {
    setLoading(true)
    const result = await fetchPageSpeedInsights(page.url)
    setPsi(result)
    setLoading(false)
  }

  return (
    <div className="space-y-2">
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
        {loading ? t('seo.runningPsi') : t('seo.runPageSpeed')}
      </Button>
      {psi?.error && <p className="text-[11px] text-amber-700 dark:text-amber-400">{psi.error}</p>}
      {psi && (psi.mobile || psi.desktop) && (
        <div className="grid grid-cols-2 gap-2">
          <PsiCard title={t('seo.mobile')} data={psi.mobile} />
          <PsiCard title={t('seo.desktop')} data={psi.desktop} />
        </div>
      )}
      {psi?.mobile?.opportunities && psi.mobile.opportunities.length > 0 && (
        <div className="rounded border p-2">
          <p className="mb-1 text-[11px] font-medium">{t('seo.opportunities')}</p>
          <ul className="list-inside list-disc text-[10px] text-muted-foreground">
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
  return (
    <div className="rounded border p-2 text-center">
      <p className="text-[11px] font-medium">{title}</p>
      <p className="text-2xl font-semibold tabular-nums">{data.score ?? '—'}</p>
      <div className="mt-1 space-y-0.5 text-[9px] text-muted-foreground">
        {data.lcp && <p>LCP {data.lcp}</p>}
        {data.cls && <p>CLS {data.cls}</p>}
        {data.inp && <p>INP {data.inp}</p>}
      </div>
    </div>
  )
}
