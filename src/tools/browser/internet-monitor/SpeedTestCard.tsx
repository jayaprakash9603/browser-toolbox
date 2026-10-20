import { ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon, GaugeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { formatMbps } from '@/core/speedtest'
import { SPEEDTEST_ROUTE } from '@/features/speedtest/routes'
import { SPEED_DOWN, SPEED_UP } from '@/features/speedtest/style'
import { useSpeedHistory } from '@/features/speedtest/useSpeedTest'
import { Button } from '@/shared/components/ui/button'

export function SpeedTestCard() {
  const { t } = useTranslation()
  const { history } = useSpeedHistory()
  const last = history[0]

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-3.5 shadow-xs">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_srgb,var(--speed-down)_12%,transparent),transparent_55%,color-mix(in_srgb,var(--speed-up)_10%,transparent))]"
      />
      <div className="relative flex flex-wrap items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--speed-down)_16%,transparent)] text-[var(--speed-down)]">
          <GaugeIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-tight font-semibold">{t('speedtest.monitor.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {last
              ? t('speedtest.monitor.last', {
                  when: new Date(last.at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })
              : t('speedtest.monitor.description')}
          </p>
        </div>
        {last && (
          <dl className="flex items-center gap-3 font-mono text-[13px] font-semibold tabular-nums">
            <div className="flex items-center gap-1">
              <dt>
                <ArrowDownIcon className="size-3.5" style={{ color: SPEED_DOWN }} aria-label={t('speedtest.metric.download')} />
              </dt>
              <dd>
                {formatMbps(last.downloadMbps)} <span className="font-sans text-[11px] font-normal text-muted-foreground">{t('speedtest.unit')}</span>
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <dt>
                <ArrowUpIcon className="size-3.5" style={{ color: SPEED_UP }} aria-label={t('speedtest.metric.upload')} />
              </dt>
              <dd>
                {formatMbps(last.uploadMbps)} <span className="font-sans text-[11px] font-normal text-muted-foreground">{t('speedtest.unit')}</span>
              </dd>
            </div>
          </dl>
        )}
        <Button asChild size="sm" className="h-8 gap-1 px-2.5 text-xs">
          <Link to={SPEEDTEST_ROUTE}>
            {t('speedtest.monitor.run')}
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}
