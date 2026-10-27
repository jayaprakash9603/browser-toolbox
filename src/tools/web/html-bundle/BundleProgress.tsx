import { useTranslation } from 'react-i18next'
import { FileArchiveIcon, FileCodeIcon, FileTextIcon, ImageIcon, SquareIcon } from 'lucide-react'

import {
  overallPercent,
  phasesFor,
  type BundleMode,
  type BundleProgressEvent,
} from '@/core/htmlBundleJob'
import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import { LongTaskProgress, type LongTaskStep } from '@/shared/components/LongTaskProgress'
import { Button } from '@/shared/components/ui/button'
import { formatElapsedSeconds as formatDuration } from '@/shared/utils/formatElapsedSeconds'
import { cn } from '@/shared/utils/cn'

import './i18n'

export { formatDuration }

const FLYING_ICONS = [FileTextIcon, FileCodeIcon, ImageIcon]

interface BundleProgressProps {
  active: boolean
  pageCount: number
  progress: BundleProgressEvent | null
  startedAt?: number
  mode?: BundleMode
  runsInBackground?: boolean
  stopRequested?: boolean
  onStop?: () => void
  onCancel?: () => void
}

function pathOf(url: string) {
  try {
    const { pathname, search } = new URL(url)
    return `${pathname}${search}`
  } catch {
    return url
  }
}

export function BundleProgress({
  active,
  pageCount,
  progress,
  startedAt,
  mode = 'links',
  runsInBackground = false,
  stopRequested = false,
  onStop,
  onCancel,
}: BundleProgressProps) {
  const { t } = useTranslation()
  const phases = phasesFor(mode)
  const percent = overallPercent(progress, mode)
  const phaseIndex = progress ? Math.max(0, phases.findIndex((item) => item.id === progress.phase)) : 0
  const crawl = progress?.crawl
  const crawling = mode === 'crawl' && (!progress || progress.phase === 'crawl')

  const detail = (() => {
    if (!progress) return t('htmlBundle.phaseStarting')
    const counts = { done: progress.done, total: progress.total }
    switch (progress.phase) {
      case 'crawl':
        return stopRequested
          ? t('htmlBundle.crawl.stopping')
          : t('htmlBundle.crawl.detailCrawl', { depth: crawl?.depth ?? 0, queued: crawl?.queued ?? 0 })
      case 'pages':
        return t('htmlBundle.detailPages', counts)
      case 'assets':
        return progress.total > 0 ? t('htmlBundle.detailAssets', counts) : t('htmlBundle.detailAssetsScan')
      case 'zip':
        return t('htmlBundle.detailZip')
      case 'transfer':
        return t('htmlBundle.detailTransfer')
    }
  })()

  const steps: LongTaskStep[] = phases.map((phase, index) => {
    const state = index < phaseIndex ? 'done' : index === phaseIndex ? 'current' : 'todo'
    return { id: phase.id, label: t(phase.label), state }
  })

  const title =
    mode === 'crawl'
      ? t('htmlBundle.crawl.title', { count: crawl?.saved ?? 0 })
      : t('htmlBundle.preparing', { count: pageCount })

  return (
    <LongTaskProgress
      active={active}
      title={title}
      percent={percent}
      detail={detail}
      detailKey={stopRequested ? 'stopping' : (progress?.phase ?? 'start')}
      startedAt={startedAt}
      centerIcon={FileArchiveIcon}
      flyingIcons={FLYING_ICONS}
      steps={steps}
      layout="auto"
      hint={runsInBackground ? t('htmlBundle.backgroundHint') : t('htmlBundle.keepOpenHint')}
      actions={
        crawling && onStop ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 shrink-0 px-2 text-[11px]"
            onClick={onStop}
            disabled={stopRequested}
            title={t('htmlBundle.crawl.stopTitle')}
          >
            <SquareIcon className="size-3 fill-current" aria-hidden />
            {t('htmlBundle.crawl.stop')}
          </Button>
        ) : undefined
      }
      onCancel={onCancel}
      cancelLabel={t('htmlBundle.cancel')}
    >
      {mode === 'crawl' && crawl && <CrawlCounters crawl={crawl} live={crawling} />}
    </LongTaskProgress>
  )
}

function CrawlCounters({ crawl, live }: { crawl: CrawlProgress; live: boolean }) {
  const { t } = useTranslation()
  const items = [
    { id: 'found', label: t('htmlBundle.crawl.found'), value: crawl.found },
    { id: 'saved', label: t('htmlBundle.crawl.saved'), value: crawl.saved, strong: true },
    { id: 'queued', label: t('htmlBundle.crawl.queued'), value: crawl.queued },
    { id: 'skipped', label: t('htmlBundle.crawl.skipped'), value: crawl.skipped + crawl.failed },
  ]
  return (
    <div className="mt-2.5 space-y-1.5">
      <dl className="grid grid-cols-2 gap-1 @[340px]:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 items-baseline justify-between gap-1.5 rounded-md bg-background/70 px-2 py-1 @[340px]:flex-col @[340px]:items-start @[340px]:gap-0"
          >
            <dt className="truncate text-[10px] text-muted-foreground">{item.label}</dt>
            <dd className={cn('text-xs font-semibold tabular-nums', item.strong && 'text-primary')}>{item.value}</dd>
          </div>
        ))}
      </dl>
      {live && crawl.current && (
        <p className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="shrink-0 font-semibold tracking-wide uppercase">{t('htmlBundle.crawl.now')}</span>
          <span className="truncate font-mono" title={crawl.current}>
            {pathOf(crawl.current)}
          </span>
        </p>
      )}
    </div>
  )
}
