import { useTranslation } from 'react-i18next'
import {
  BookmarkIcon,
  HeartIcon,
  LayersIcon,
  LayoutGridIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  TagsIcon,
} from 'lucide-react'

import type { BookmarkNavId } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

const ITEMS: { id: BookmarkNavId; icon: typeof BookmarkIcon; label: string }[] = [
  { id: 'all', icon: BookmarkIcon, label: 'bookmarks.nav.all' },
  { id: 'collections', icon: LayersIcon, label: 'bookmarks.nav.collections' },
  { id: 'projects', icon: LayoutGridIcon, label: 'bookmarks.nav.projects' },
  { id: 'favorites', icon: HeartIcon, label: 'bookmarks.nav.favorites' },
  { id: 'reading', icon: BookOpenIcon, label: 'bookmarks.nav.reading' },
  { id: 'tags', icon: TagsIcon, label: 'bookmarks.nav.tags' },
  { id: 'health', icon: ShieldCheckIcon, label: 'bookmarks.nav.health' },
]

export function BookmarkNav({
  value,
  onChange,
}: {
  value: BookmarkNavId
  onChange: (id: BookmarkNavId) => void
}) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('bookmarks.nav.all')}
      className="scrollbar-none flex gap-1 overflow-x-auto pb-0.5"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        const selected = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors duration-150',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {t(item.label)}
          </button>
        )
      })}
    </nav>
  )
}
