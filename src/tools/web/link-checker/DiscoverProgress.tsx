import { useTranslation } from 'react-i18next'
import { ScanSearchIcon, SquareIcon } from 'lucide-react'

import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import { LongTaskProgress } from '@/shared/components/LongTaskProgress'
import { Button } from '@/shared/components/ui/button'

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
  startedAt,
  stopRequested,
  onStop,
}: {
  active: boolean
  crawl: CrawlProgress | null
  startedAt: number
  stopRequested?: boolean
  onStop?: () => void
}) {
  const { t } = useTranslation()
  const saved = crawl?.saved ?? 0
  const total = Math.min(Math.max(crawl?.found ?? 0, saved), crawl ? saved + crawl.queued : 0) || saved || 1
  const percent = crawl ? Math.min(100, Math.round((saved / Math.max(total, 1)) * 100)) : 0
  const detail = stopRequested
    ? t('linkChecker.crawl.stopping')
    : t('linkChecker.crawl.detail', { depth: crawl?.depth ?? 0, queued: crawl?.queued ?? 0 })

  return (
    <LongTaskProgress
      active={active}
      title={t('linkChecker.crawl.title', { count: saved })}
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
      {crawl && (
        <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground" title={crawl.current}>
          {crawl.current ? pathOf(crawl.current) : t('linkChecker.crawl.starting')}
        </p>
      )}
    </LongTaskProgress>
  )
}
