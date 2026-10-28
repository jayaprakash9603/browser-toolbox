import { useTranslation } from 'react-i18next'
import { ScanSearchIcon, SquareIcon } from 'lucide-react'

import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import { LongTaskProgress } from '@/shared/components/LongTaskProgress'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

function pathOf(url: string) {
  try {
    const { pathname, search } = new URL(url)
    return `${pathname}${search}`
  } catch {
    return url
  }
}

export function DiscoverProgress({
  active,
  crawl,
  maxPages,
  startedAt,
  stopRequested,
  onStop,
}: {
  active: boolean
  crawl: CrawlProgress | null
  maxPages: number
  startedAt: number
  stopRequested?: boolean
  onStop?: () => void
}) {
  const { t } = useTranslation()
  const fetched = crawl?.saved ?? 0
  const unique = crawl?.found ?? 0
  const queued = crawl?.queued ?? 0
  const remaining = Math.max(0, Math.min(maxPages, fetched + queued) - fetched)
  const total = Math.max(1, Math.min(maxPages, fetched + queued) || maxPages)
  const percent = Math.min(100, Math.round((fetched / total) * 100))
  const detail = stopRequested
    ? t('linkChecker.crawl.stopping')
    : t('linkChecker.crawl.detail', { depth: crawl?.depth ?? 0, queued: remaining })

  return (
    <LongTaskProgress
      active={active}
      title={t('linkChecker.crawl.title', { count: unique })}
      percent={percent}
      detail={detail}
      detailKey={stopRequested ? 'stopping' : crawl?.current ?? 'start'}
      startedAt={startedAt}
      centerIcon={ScanSearchIcon}
      layout="compact"
      hint={t('linkChecker.crawl.hint')}
      actions={
        onStop ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2 text-[11px]"
            onClick={onStop}
            disabled={stopRequested}
            title={t('linkChecker.crawl.stopTitle')}
          >
            <SquareIcon className="size-3 fill-current" aria-hidden />
            {t('linkChecker.crawl.stop')}
          </Button>
        ) : undefined
      }
    >
      <dl className="mt-2 grid grid-cols-3 gap-1">
        <Stat label={t('linkChecker.crawl.statPages')} value={fetched} />
        <Stat label={t('linkChecker.crawl.statUrls')} value={unique} strong />
        <Stat label={t('linkChecker.crawl.statWaiting')} value={remaining} />
      </dl>
      {crawl?.current && (
        <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground" title={crawl.current}>
          {pathOf(crawl.current)}
        </p>
      )}
    </LongTaskProgress>
  )
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-md bg-background/70 px-2 py-1">
      <dt className="truncate text-[10px] text-muted-foreground">{label}</dt>
      <dd className={cn('text-xs font-semibold tabular-nums', strong && 'text-primary')}>{value}</dd>
    </div>
  )
}
