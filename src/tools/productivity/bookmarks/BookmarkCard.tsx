import { useTranslation } from 'react-i18next'
import { HeartIcon, MoreVerticalIcon } from 'lucide-react'

import { COLLECTION_COLOR_CLASS, itemMeta, type BookmarkWorkspace } from '@/core/bookmarks'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/utils/cn'

import { BookmarkFavicon } from './BookmarkFavicon'
import { BookmarkThumb } from './BookmarkThumb'
import { CardMenu, type CardMenuActions } from './CardMenu'
import { StatusBadges } from './StatusBadges'
import { bookmarkDomain, type BookmarkRow } from './service'

export function BookmarkCard({
  row,
  workspace,
  mode,
  selected,
  duplicate,
  health,
  onSelect,
  onOpen,
  actions,
}: {
  row: BookmarkRow
  workspace: BookmarkWorkspace
  mode: 'visual' | 'compact'
  selected: boolean
  duplicate?: boolean
  health?: 'ok' | 'redirect' | 'broken' | 'auth' | 'blocked' | 'timeout' | 'network' | 'invalid'
  onSelect: (id: string, selected: boolean) => void
  onOpen: () => void
  actions: CardMenuActions
}) {
  const { t } = useTranslation()
  const meta = itemMeta(workspace, row.id)
  const collection = meta.collectionIds.map((id) => workspace.collections[id]).find(Boolean)
  const tags = meta.tagIds.slice(0, 3).map((id) => workspace.tags[id]).filter(Boolean)
  return (
    <article
      className={cn(
        'group flex flex-col gap-2 rounded-[var(--radius)] border bg-card p-2.5 transition-colors duration-150',
        selected ? 'border-primary bg-primary/[0.04]' : 'hover:border-primary/30',
      )}
    >
      {mode === 'visual' && <BookmarkThumb bookmarkId={row.id} url={row.url} />}
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onSelect(row.id, value === true)}
          aria-label={row.title}
          className="mt-1"
        />
        {mode === 'compact' && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
            <BookmarkFavicon url={row.url} />
          </span>
        )}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 cursor-pointer text-left">
          <p className="truncate text-sm font-semibold leading-5">{row.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{bookmarkDomain(row.url)}</p>
          {meta.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{meta.description}</p>
          ) : null}
        </button>
        <Button
          size="icon-xs"
          variant="ghost"
          className="size-8"
          aria-label={meta.favorite ? t('bookmarks.unfavorite') : t('bookmarks.favorite')}
          onClick={actions.onFavorite}
        >
          <HeartIcon className={cn('size-4', meta.favorite && 'fill-rose-500 text-rose-500')} />
        </Button>
        <CardMenu actions={actions} trigger={<MoreVerticalIcon className="size-4" />} />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {collection && (
          <span className={cn('rounded-full px-1.5 py-px text-[10px] font-medium', COLLECTION_COLOR_CLASS[collection.color])}>
            {collection.name}
          </span>
        )}
        {tags.map((tag) => (
          <span key={tag.id} className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
            {tag.name}
          </span>
        ))}
        <StatusBadges meta={meta} health={health} duplicate={duplicate} />
      </div>
    </article>
  )
}
