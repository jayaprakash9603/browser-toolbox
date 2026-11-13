import { useTranslation } from 'react-i18next'
import {
  AlertTriangleIcon,
  BookmarkIcon,
  CopyIcon,
  FolderIcon,
  HeartIcon,
  InboxIcon,
  Link2OffIcon,
  SparklesIcon,
} from 'lucide-react'

import type { BookmarkFilterChip, BookmarkStats } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

const PILLS: {
  key: keyof BookmarkStats
  chip?: BookmarkFilterChip
  icon: typeof BookmarkIcon
  label: string
  tone: string
}[] = [
  { key: 'bookmarks', icon: BookmarkIcon, label: 'bookmarks.stat.bookmarks', tone: 'text-primary' },
  { key: 'folders', icon: FolderIcon, label: 'bookmarks.stat.folders', tone: 'text-muted-foreground' },
  {
    key: 'uncategorized',
    chip: 'uncategorized',
    icon: InboxIcon,
    label: 'bookmarks.stat.uncategorized',
    tone: 'text-muted-foreground',
  },
  { key: 'recent', chip: 'recent', icon: SparklesIcon, label: 'bookmarks.stat.recent', tone: 'text-sky-600' },
  { key: 'favorites', chip: 'favorites', icon: HeartIcon, label: 'bookmarks.stat.favorites', tone: 'text-rose-600' },
  { key: 'unread', chip: 'unread', icon: AlertTriangleIcon, label: 'bookmarks.stat.unread', tone: 'text-amber-600' },
  { key: 'duplicates', chip: 'duplicates', icon: CopyIcon, label: 'bookmarks.stat.duplicates', tone: 'text-amber-700' },
  { key: 'broken', chip: 'broken', icon: Link2OffIcon, label: 'bookmarks.stat.broken', tone: 'text-destructive' },
]

export function OverviewStrip({
  stats,
  chips,
  onToggle,
}: {
  stats: BookmarkStats
  chips: readonly BookmarkFilterChip[]
  onToggle: (chip: BookmarkFilterChip) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="scrollbar-none -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
      {PILLS.map((pill) => {
        const active = pill.chip ? chips.includes(pill.chip) : false
        const Icon = pill.icon
        return (
          <button
            key={pill.key}
            type="button"
            disabled={!pill.chip}
            onClick={() => pill.chip && onToggle(pill.chip)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-left transition-colors duration-150',
              active ? 'border-primary/40 bg-primary/10' : 'border-border bg-card hover:border-primary/25',
              pill.chip ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <Icon className={cn('size-3.5', pill.tone)} aria-hidden />
            <span className="text-[11px] text-muted-foreground">{t(pill.label)}</span>
            <span className="text-[11px] font-semibold tabular-nums">{stats[pill.key]}</span>
          </button>
        )
      })}
    </div>
  )
}
