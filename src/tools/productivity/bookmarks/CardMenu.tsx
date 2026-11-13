import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  BookOpenIcon,
  CircleCheckIcon,
  CopyIcon,
  HeartIcon,
  LayersIcon,
  LinkIcon,
  PencilIcon,
  PinIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export interface CardMenuActions {
  onEdit: () => void
  onCopyUrl: () => void
  onCopyMarkdown: () => void
  onFavorite: () => void
  onDelete: () => void
  onReading: (status: 'unread' | 'reading' | 'completed' | 'archived') => void
  collections?: { id: string; name: string; assigned: boolean }[]
  onToggleCollection?: (id: string, assigned: boolean) => void
  onTogglePin?: () => void
}

export function CardMenu({ actions, trigger }: { actions: CardMenuActions; trigger: ReactNode }) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-xs" variant="ghost" className="size-8" aria-label={t('bookmarks.exportMenu')}>
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={actions.onEdit}>
          <PencilIcon className="size-4" />
          {t('bookmarks.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={actions.onFavorite}>
          <HeartIcon className="size-4" />
          {t('bookmarks.favorite')}
        </DropdownMenuItem>
        {actions.collections && actions.onToggleCollection && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <LayersIcon className="size-4" />
              {t('bookmarks.collection.assign')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {actions.collections.map((collection) => (
                <DropdownMenuItem
                  key={collection.id}
                  onSelect={() => actions.onToggleCollection?.(collection.id, !collection.assigned)}
                >
                  {collection.assigned ? '✓ ' : ''}
                  {collection.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {actions.onTogglePin && (
          <DropdownMenuItem onSelect={actions.onTogglePin}>
            <PinIcon className="size-4" />
            {t('bookmarks.project.pin')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={actions.onCopyUrl}>
          <LinkIcon className="size-4" />
          {t('bookmarks.copyUrl')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={actions.onCopyMarkdown}>
          <CopyIcon className="size-4" />
          {t('bookmarks.copyMarkdownLine')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => actions.onReading('unread')}>
          <RotateCcwIcon className="size-4" />
          {t('bookmarks.markUnread')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onReading('reading')}>
          <BookOpenIcon className="size-4" />
          {t('bookmarks.markReading')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onReading('completed')}>
          <CircleCheckIcon className="size-4" />
          {t('bookmarks.markCompleted')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onReading('archived')}>
          <ArchiveIcon className="size-4" />
          {t('bookmarks.markArchived')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={actions.onDelete}>
          <Trash2Icon className="size-4" />
          {t('bookmarks.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
