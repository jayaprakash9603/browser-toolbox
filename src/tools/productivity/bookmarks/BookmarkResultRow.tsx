import type { PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { Reorder, motion, useDragControls, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/utils/cn'

import { BookmarkFavicon } from './BookmarkFavicon'
import { bookmarkDomain, type BookmarkRow } from './service'

const clearSelection = () => window.getSelection()?.removeAllRanges()

export interface BookmarkRowActions {
  onOpen: () => void
  onCopyUrl: () => void
  onCopyMarkdown: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

interface BookmarkResultRowProps extends BookmarkRowActions {
  row: BookmarkRow
  highlighted?: boolean
  duplicate?: boolean
  showFolder?: boolean
  reorderable?: boolean
  onDragEnd?: () => void
}

const ROW_CLASS =
  'group flex min-h-14 items-center gap-2 rounded-xl border bg-card py-1.5 pr-1.5 pl-2 transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/30 hover:bg-muted/20'

export function BookmarkResultRow({
  row,
  highlighted,
  reorderable,
  onDragEnd,
  ...rest
}: BookmarkResultRowProps) {
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const className = cn(ROW_CLASS, highlighted && 'border-primary/40 bg-primary/[0.05]')

  if (reorderable) {
    return (
      <Reorder.Item
        as="div"
        value={row.id}
        dragListener={false}
        dragControls={controls}
        onDragStart={clearSelection}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.015, boxShadow: '0 10px 28px -8px rgb(0 0 0 / 0.35)', zIndex: 20 }}
        transition={{ duration: 0.18 }}
        className={cn(className, 'relative select-none')}
      >
        <DragHandle
          onPointerDown={(event) => {
            event.preventDefault()
            controls.start(event)
          }}
        />
        <RowBody row={row} {...rest} />
      </Reorder.Item>
    )
  }

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <RowBody row={row} {...rest} />
    </motion.div>
  )
}

function DragHandle({ onPointerDown }: { onPointerDown: (event: PointerEvent) => void }) {
  const { t } = useTranslation()
  return (
    <span
      role="img"
      aria-label={t('bookmarks.dragHandle')}
      title={t('bookmarks.dragHandle')}
      onPointerDown={onPointerDown}
      className="flex h-9 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-4" aria-hidden />
    </span>
  )
}

function RowBody({
  row,
  duplicate,
  showFolder,
  onOpen,
  onCopyUrl,
  onCopyMarkdown,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Omit<BookmarkResultRowProps, 'highlighted' | 'reorderable' | 'onDragEnd'>) {
  const { t } = useTranslation()
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${t('bookmarks.open')}: ${row.title}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
          <BookmarkFavicon url={row.url} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">{row.title}</span>
            {duplicate && (
              <span className="shrink-0 rounded-full border border-amber-500/35 bg-amber-500/10 px-1.5 py-px text-[9px] font-medium text-amber-600 dark:text-amber-400">
                {t('bookmarks.duplicateBadge')}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10.5px] text-muted-foreground">
            <span className="shrink-0 font-mono text-[10px] text-foreground/70">
              {bookmarkDomain(row.url)}
            </span>
            {showFolder && (
              <>
                <span aria-hidden className="shrink-0 text-muted-foreground/50">
                  ·
                </span>
                <span className="min-w-0 truncate">{row.folderPath}</span>
              </>
            )}
          </span>
        </span>
      </button>

      <Button
        size="icon-xs"
        variant="ghost"
        className="size-8 shrink-0"
        aria-label={t('bookmarks.open')}
        title={t('bookmarks.open')}
        onClick={onOpen}
      >
        <ExternalLinkIcon className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-xs"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label={t('bookmarks.exportMenu')}
          >
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon className="size-4" />
            {t('bookmarks.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyUrl}>
            <LinkIcon className="size-4" />
            {t('bookmarks.copyUrl')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onCopyMarkdown}>
            <CopyIcon className="size-4" />
            {t('bookmarks.copyMarkdownLine')}
          </DropdownMenuItem>
          {(onMoveUp || onMoveDown) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!onMoveUp} onSelect={onMoveUp}>
                <ArrowUpIcon className="size-4" />
                {t('bookmarks.moveUp')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!onMoveDown} onSelect={onMoveDown}>
                <ArrowDownIcon className="size-4" />
                {t('bookmarks.moveDown')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2Icon className="size-4" />
            {t('bookmarks.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
