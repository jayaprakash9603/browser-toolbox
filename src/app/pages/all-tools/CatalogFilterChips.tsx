import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GalleryHorizontalEndIcon } from 'lucide-react'

import { ChipRail } from '@/shared/components/ChipRail'
import { cn } from '@/shared/utils/cn'

import '@/app/pages/all-tools/i18n'

export function CatalogFilterChips({
  filter,
  allCount,
  categories,
  viewerOpen,
  onFilter,
  onOpenFullView,
  className,
}: {
  filter: string
  allCount: number
  categories: readonly { id: string; name: string; count: number; icon: ReactNode }[]
  viewerOpen: boolean
  onFilter: (id: string) => void
  onOpenFullView: () => void
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex items-stretch gap-1.5', className)}>
      <ChipRail role="group" label={t('allTools.filter')} rows={2} className="min-w-0 flex-1">
        <CatalogChip active={filter === 'all'} count={allCount} onClick={() => onFilter('all')}>
          {t('allTools.all')}
        </CatalogChip>
        {categories.map(({ id, name, count, icon }) => (
          <CatalogChip
            key={id}
            active={filter === id}
            count={count}
            onClick={() => onFilter(filter === id ? 'all' : id)}
          >
            {icon}
            {name}
          </CatalogChip>
        ))}
      </ChipRail>
      <button
        type="button"
        onClick={onOpenFullView}
        aria-haspopup="dialog"
        aria-expanded={viewerOpen}
        aria-label={t('allTools.viewer.open')}
        title={t('allTools.viewer.open')}
        className="group my-0.5 flex w-10 shrink-0 items-center justify-center rounded-2xl border bg-card text-muted-foreground outline-none transition-[color,border-color,background-color] duration-200 hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:active:scale-100"
      >
        <GalleryHorizontalEndIcon
          className="size-4 transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none"
          aria-hidden
        />
      </button>
    </div>
  )
}

function CatalogChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-2 rounded-full border ps-2.5 pe-3 text-xs font-medium whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
      )}
    >
      <span className="flex items-center gap-1.5">{children}</span>
      <span
        className={cn(
          'ms-auto text-[10px] tabular-nums',
          active ? 'text-background/70' : 'text-muted-foreground/70',
        )}
      >
        {count}
      </span>
    </button>
  )
}
