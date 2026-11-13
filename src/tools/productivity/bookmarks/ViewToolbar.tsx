import { useTranslation } from 'react-i18next'
import { LayoutGridIcon, LayoutListIcon, Rows3Icon, StretchHorizontalIcon } from 'lucide-react'

import type { BookmarkDisplayMode } from '@/core/bookmarks'
import { Segmented } from '@/shared/components/ui/segmented'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { BookmarkSort } from './service'

const MODES: { value: BookmarkDisplayMode; icon: typeof LayoutGridIcon; label: string }[] = [
  { value: 'visual', icon: LayoutGridIcon, label: 'bookmarks.mode.visual' },
  { value: 'compact', icon: StretchHorizontalIcon, label: 'bookmarks.mode.compact' },
  { value: 'detailed', icon: LayoutListIcon, label: 'bookmarks.mode.detailed' },
  { value: 'minimal', icon: Rows3Icon, label: 'bookmarks.mode.minimal' },
]

export function ViewToolbar({
  mode,
  onMode,
  sort,
  onSort,
  canSortManually,
}: {
  mode: BookmarkDisplayMode
  onMode: (mode: BookmarkDisplayMode) => void
  sort: BookmarkSort
  onSort: (sort: BookmarkSort) => void
  canSortManually: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1.5">
      <Segmented
        size="sm"
        ariaLabel={t('bookmarks.modeLabel')}
        value={mode}
        onValueChange={onMode}
        options={MODES.map((item) => {
          const Icon = item.icon
          return { value: item.value, title: t(item.label), label: <Icon className="size-3.5" /> }
        })}
      />
      <Select value={sort} onValueChange={(value) => onSort(value as BookmarkSort)}>
        <SelectTrigger aria-label={t('bookmarks.filter.sort')} className="h-8 min-w-0 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual" disabled={!canSortManually}>
            {t('bookmarks.sort.manual')}
          </SelectItem>
          <SelectItem value="recent">{t('bookmarks.sort.recent')}</SelectItem>
          <SelectItem value="oldest">{t('bookmarks.sort.oldest')}</SelectItem>
          <SelectItem value="title">{t('bookmarks.sort.title')}</SelectItem>
          <SelectItem value="domain">{t('bookmarks.sort.domain')}</SelectItem>
          <SelectItem value="accessed">{t('bookmarks.sort.accessed')}</SelectItem>
          <SelectItem value="mostAccessed">{t('bookmarks.sort.mostAccessed')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
