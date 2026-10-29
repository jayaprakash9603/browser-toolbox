import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, FolderIcon, MoreVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

import type { BookmarkFolder } from './service'

interface BookmarkFolderRowProps {
  folder: BookmarkFolder
  onOpen: (folder: BookmarkFolder) => void
  onRename: (folder: BookmarkFolder) => void
  onDelete: (folder: BookmarkFolder) => void
}

export function BookmarkFolderRow({ folder, onOpen, onRename, onDelete }: BookmarkFolderRowProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group flex min-h-14 items-center gap-2 rounded-xl border bg-muted/30 py-1.5 pr-1.5 pl-2 transition-[border-color,background-color] duration-150 hover:border-primary/30 hover:bg-muted/50"
    >
      <button
        type="button"
        onClick={() => onOpen(folder)}
        aria-label={`${t('bookmarks.openFolder')}: ${folder.title}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <FolderIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-semibold text-foreground">{folder.title}</span>
          <span className="mt-0.5 block text-[10.5px] text-muted-foreground tabular-nums">
            {t('bookmarks.itemCount', { count: folder.count })}
          </span>
        </span>
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
      {folder.editable ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" className="size-8 shrink-0" aria-label={t('bookmarks.exportMenu')}>
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(folder)}>
              <PencilIcon className="size-4" />
              {t('bookmarks.renameFolder')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(folder)}>
              <Trash2Icon className="size-4" />
              {t('bookmarks.deleteFolder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="size-8 shrink-0" aria-hidden />
      )}
    </motion.div>
  )
}
