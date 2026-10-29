import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

import { FolderSelect } from './FolderSelect'
import type { BookmarkFolder, BookmarkSort, BookmarkView } from './service'

interface BookmarkFiltersProps {
  folders: readonly BookmarkFolder[]
  folderId: string
  onFolderChange: (id: string) => void
  domains: readonly { domain: string; count: number }[]
  domain: string
  onDomainChange: (domain: string) => void
  view: BookmarkView
  onViewChange: (view: BookmarkView) => void
  duplicateCount: number
  sort: BookmarkSort
  onSortChange: (sort: BookmarkSort) => void
  canSortManually: boolean
}

export function BookmarkFilters({
  folders,
  folderId,
  onFolderChange,
  domains,
  domain,
  onDomainChange,
  view,
  onViewChange,
  duplicateCount,
  sort,
  onSortChange,
  canSortManually,
}: BookmarkFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-1.5 @[600px]:grid-cols-4">
      <FilterField label={t('bookmarks.filter.folder')}>
        <FolderSelect
          folders={folders}
          value={folderId}
          onValueChange={onFolderChange}
          allLabel={t('bookmarks.allBookmarks')}
          ariaLabel={t('bookmarks.filter.folder')}
        />
      </FilterField>

      <FilterField label={t('bookmarks.filter.site')}>
        <Select value={domain} onValueChange={onDomainChange}>
          <SelectTrigger aria-label={t('bookmarks.filter.site')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('bookmarks.allSites')}</SelectItem>
            {domains.map((item) => (
              <SelectItem key={item.domain} value={item.domain}>
                {item.domain} ({item.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label={t('bookmarks.filter.show')}>
        <Select value={view} onValueChange={(value) => onViewChange(value as BookmarkView)}>
          <SelectTrigger aria-label={t('bookmarks.filter.show')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('bookmarks.view.all')}</SelectItem>
            <SelectItem value="recent">{t('bookmarks.view.recent30d')}</SelectItem>
            <SelectItem value="duplicates" disabled={duplicateCount === 0}>
              {t('bookmarks.view.duplicates', { count: duplicateCount })}
            </SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label={t('bookmarks.filter.sort')}>
        <Select value={sort} onValueChange={(value) => onSortChange(value as BookmarkSort)}>
          <SelectTrigger aria-label={t('bookmarks.filter.sort')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual" disabled={!canSortManually}>
              {t('bookmarks.sort.manual')}
            </SelectItem>
            <SelectItem value="recent">{t('bookmarks.sort.recent')}</SelectItem>
            <SelectItem value="title">{t('bookmarks.sort.title')}</SelectItem>
            <SelectItem value="domain">{t('bookmarks.sort.domain')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="px-0.5 text-[9.5px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}
