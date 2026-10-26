import { CircleCheckIcon, EqualApproximatelyIcon, EqualNotIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AlignedDiff } from '@/core/engines/diff'
import { cn } from '@/shared/utils/cn'

import { SWATCH } from './styles'

function Count({ swatch, label, value }: { swatch: keyof typeof SWATCH; label: string; value: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', value === 0 && 'opacity-50')}>
      <span aria-hidden className={cn('size-2 rounded-[2px]', SWATCH[swatch])} />
      {label}
    </span>
  )
}

export function StatusBar({
  diff,
  message,
  className,
}: {
  diff: AlignedDiff
  message: string | null
  className?: string
}) {
  const { t } = useTranslation()
  const { stats, verdict } = diff
  const eolMismatch = diff.left.eol !== diff.right.eol && diff.left.eol !== 'None' && diff.right.eol !== 'None'

  const verdictIcon =
    verdict === 'identical' ? (
      <CircleCheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
    ) : verdict === 'minor' ? (
      <EqualApproximatelyIcon className="size-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
    ) : verdict === 'different' ? (
      <EqualNotIcon className="size-3.5 text-red-600 dark:text-red-400" aria-hidden />
    ) : (
      <InfoIcon className="size-3.5" aria-hidden />
    )

  return (
    <footer
      className={cn(
        'flex min-h-8 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground',
        className,
      )}
    >
      <span role="status" className="inline-flex items-center gap-1.5 font-medium text-foreground">
        {verdictIcon}
        {message ?? t(`diff.verdict.${verdict}`, { count: diff.sections.length })}
      </span>
      {verdict !== 'empty' && (
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 tabular-nums">
          <Count swatch="changed" label={t('diff.statChanged', { count: stats.changed })} value={stats.changed} />
          <Count swatch="orphan" label={t('diff.statLeftOnly', { count: stats.leftOnly })} value={stats.leftOnly} />
          <Count swatch="orphan" label={t('diff.statRightOnly', { count: stats.rightOnly })} value={stats.rightOnly} />
          <Count swatch="minor" label={t('diff.statMinor', { count: stats.minor })} value={stats.minor} />
        </span>
      )}
      <span className="ml-auto flex items-center gap-2.5">
        {diff.approximate && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <TriangleAlertIcon className="size-3.5" aria-hidden />
            {t('diff.approximate')}
          </span>
        )}
        {eolMismatch && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" title={t('diff.eolMismatchHint')}>
            <TriangleAlertIcon className="size-3.5" aria-hidden />
            {t('diff.eolMismatch', { left: diff.left.eol, right: diff.right.eol })}
          </span>
        )}
      </span>
    </footer>
  )
}
