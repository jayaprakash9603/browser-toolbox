import { useTranslation } from 'react-i18next'

import { formatBytes, formatSpeed, type DownloadLiveSnapshot } from '@/core/download-manager'
import { cn } from '@/shared/utils/cn'

export function DownloadStatsHero({ snapshot }: { snapshot: DownloadLiveSnapshot | null }) {
  const { t } = useTranslation()
  const stats = snapshot?.stats
  const tiles = [
    { label: t('downloadManager.stats.total'), value: stats?.total ?? 0, text: false, accent: false },
    { label: t('downloadManager.stats.active'), value: stats?.active ?? 0, text: false, accent: true },
    { label: t('downloadManager.stats.completed'), value: stats?.completed ?? 0, text: false, accent: false },
    { label: t('downloadManager.stats.failed'), value: stats?.failed ?? 0, text: false, accent: 'danger' as const },
    { label: t('downloadManager.stats.data'), value: formatBytes(stats?.bytesCompleted ?? 0), text: true, accent: false },
    { label: t('downloadManager.stats.speed'), value: formatSpeed(stats?.aggregateSpeedBps ?? 0), text: true, accent: false },
  ]
  return (
    <section aria-label={t('downloadManager.stats.aria')}>
      <div className="grid grid-cols-2 gap-2.5 @md:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              'rounded-xl border bg-card/90 p-3 shadow-xs',
              tile.accent === true && 'border-sky-500/25 bg-sky-500/5',
              tile.accent === 'danger' && 'border-rose-500/20 bg-rose-500/5',
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums leading-tight tracking-tight">{tile.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
