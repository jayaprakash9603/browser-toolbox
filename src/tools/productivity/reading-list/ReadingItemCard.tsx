import { useTranslation } from 'react-i18next'
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { readingDomain, type ReadingItem } from './model'

interface ReadingItemCardProps {
  item: ReadingItem
  onToggleRead: (id: string) => void
  onToggleStar: (id: string) => void
  onOpen: (item: ReadingItem) => void
  onCopyLink: (item: ReadingItem) => void
  onCopyMarkdown: (item: ReadingItem) => void
  onEdit: (item: ReadingItem) => void
  onDelete: (item: ReadingItem) => void
  onTagClick: (tag: string) => void
}

export function ReadingItemCard({
  item,
  onToggleRead,
  onToggleStar,
  onOpen,
  onCopyLink,
  onCopyMarkdown,
  onEdit,
  onDelete,
  onTagClick,
}: ReadingItemCardProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <motion.article
      layout={!reduce}
      className={cn(
        'group flex gap-2.5 rounded-xl border bg-card p-3 shadow-xs transition-[border-color,box-shadow,opacity] duration-200 hover:border-primary/30 hover:shadow-sm',
        !item.read && 'border-primary/25 bg-primary/[0.03]',
        item.read && 'opacity-80',
      )}
    >
      <button
        type="button"
        onClick={() => onToggleRead(item.id)}
        aria-pressed={item.read}
        aria-label={item.read ? t('readingList.markUnread') : t('readingList.markRead')}
        title={item.read ? t('readingList.markUnread') : t('readingList.markRead')}
        className={cn(
          'mt-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          item.read
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
        )}
      >
        <motion.span
          key={String(item.read)}
          initial={reduce ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 26 }}
          className="flex"
        >
          <CheckIcon className={cn('size-4', !item.read && 'opacity-40')} strokeWidth={item.read ? 3 : 2} />
        </motion.span>
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="block max-w-full cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h3
            className={cn(
              'line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary',
              item.read && 'text-muted-foreground line-through decoration-muted-foreground/40',
            )}
          >
            {item.title}
          </h3>
        </button>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[10.5px] text-muted-foreground">
          <span className="min-w-0 truncate font-mono">{readingDomain(item.url)}</span>
          <span aria-hidden className="shrink-0 text-muted-foreground/50">
            ·
          </span>
          <span className="shrink-0 tabular-nums">
            {new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </p>
        {item.note && (
          <p className="mt-1.5 rounded-md border-l-2 border-primary/40 bg-muted/40 py-1 pr-2 pl-2 text-xs leading-relaxed text-foreground/80">
            {item.note}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                className="cursor-pointer rounded-full border bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <Button
          size="icon-xs"
          variant="ghost"
          className="size-8"
          aria-pressed={Boolean(item.starred)}
          aria-label={item.starred ? t('readingList.unstar') : t('readingList.star')}
          title={item.starred ? t('readingList.unstar') : t('readingList.star')}
          onClick={() => onToggleStar(item.id)}
        >
          <StarIcon className={cn('size-4', item.starred && 'fill-amber-400 text-amber-500')} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" className="size-8" aria-label={t('nav.moreOptions')}>
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(item)}>
              <ExternalLinkIcon className="size-4" />
              {t('readingList.open')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopyLink(item)}>
              <LinkIcon className="size-4" />
              {t('readingList.copyLink')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopyMarkdown(item)}>
              <CopyIcon className="size-4" />
              {t('readingList.copyMd')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(item)}>
              <PencilIcon className="size-4" />
              {t('readingList.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(item)}>
              <Trash2Icon className="size-4" />
              {t('readingList.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.article>
  )
}
