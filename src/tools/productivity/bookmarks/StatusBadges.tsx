import { useTranslation } from 'react-i18next'
import { HeartIcon, Link2OffIcon } from 'lucide-react'

import type { BookmarkItemMeta, HealthKind, ReadingStatus } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

const READING_CLASS: Record<ReadingStatus, string> = {
  unread: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  reading: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  completed: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  archived: 'bg-slate-500/12 text-slate-600 dark:text-slate-300',
}

export function StatusBadges({
  meta,
  health,
  duplicate,
}: {
  meta: BookmarkItemMeta
  health?: HealthKind
  duplicate?: boolean
}) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap items-center gap-1">
      {meta.favorite && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-600">
          <HeartIcon className="size-3 fill-current" aria-hidden />
          <span className="sr-only">{t('bookmarks.favorite')}</span>
        </span>
      )}
      {meta.readingStatus && (
        <span className={cn('rounded-full px-1.5 py-px text-[9px] font-medium', READING_CLASS[meta.readingStatus])}>
          {t(`bookmarks.reading.${meta.readingStatus}`)}
        </span>
      )}
      {duplicate && (
        <span className="rounded-full bg-amber-500/12 px-1.5 py-px text-[9px] font-medium text-amber-700">
          {t('bookmarks.duplicateBadge')}
        </span>
      )}
      {health === 'broken' && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-px text-[9px] font-medium text-destructive">
          <Link2OffIcon className="size-3" aria-hidden />
          {t('bookmarks.health.broken')}
        </span>
      )}
    </span>
  )
}
