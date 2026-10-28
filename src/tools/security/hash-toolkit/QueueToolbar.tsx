import { useTranslation } from 'react-i18next'
import { SearchIcon } from 'lucide-react'

import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'

import type { QueueFilter, QueueSort } from './sessionStats'

const SORTS: QueueSort[] = ['name', 'size', 'entropy']
const FILTERS: QueueFilter[] = ['all', 'duplicates', 'modified', 'high', 'risky']

export function QueueToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
}: {
  query: string
  onQueryChange: (value: string) => void
  sort: QueueSort
  onSortChange: (value: QueueSort) => void
  filter: QueueFilter
  onFilterChange: (value: QueueFilter) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background/80 p-2">
      <label className="relative block">
        <span className="sr-only">{t('hashToolkit.queue.search')}</span>
        <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('hashToolkit.queue.search')}
          className="h-8 pl-7 text-xs"
        />
      </label>
      <div className="flex flex-col gap-2">
        <Segmented
          value={sort}
          onValueChange={(value) => onSortChange(value as QueueSort)}
          ariaLabel={t('hashToolkit.queue.sort')}
          size="sm"
          className="w-full flex-wrap"
          options={SORTS.map((value) => ({
            value,
            label: t(`hashToolkit.queue.sort.${value}`),
          }))}
        />
        <Segmented
          value={filter}
          onValueChange={(value) => onFilterChange(value as QueueFilter)}
          ariaLabel={t('hashToolkit.queue.filter')}
          size="sm"
          className="w-full flex-wrap"
          options={FILTERS.map((value) => ({
            value,
            label: t(`hashToolkit.queue.filter.${value}`),
          }))}
        />
      </div>
    </div>
  )
}
