import { useTranslation } from 'react-i18next'
import {
  BookmarkPlusIcon,
  DownloadIcon,
  FileCodeIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderPlusIcon,
  LayersIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

import {
  exportBookmarksCsv,
  exportBookmarksHtml,
  exportBookmarksJson,
  exportBookmarksMarkdown,
  type BookmarkRow,
} from './service'

export const OPEN_BATCH_LIMIT = 10

export function AddMenu({
  disabled,
  onNewBookmark,
  onBookmarkTab,
  onNewFolder,
}: {
  disabled: boolean
  onNewBookmark: () => void
  onBookmarkTab: () => void
  onNewFolder: () => void
}) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="shrink-0" disabled={disabled}>
          <PlusIcon />
          <span className="hidden @[380px]:inline">{t('bookmarks.add')}</span>
          <span className="sr-only @[380px]:hidden">{t('bookmarks.add')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onNewBookmark}>
          <LinkIcon className="size-4" />
          {t('bookmarks.newBookmark')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onBookmarkTab}>
          <BookmarkPlusIcon className="size-4" />
          {t('bookmarks.bookmarkTab')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onNewFolder}>
          <FolderPlusIcon className="size-4" />
          {t('bookmarks.newFolder')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface MoreMenuProps {
  rows: BookmarkRow[]
  loading: boolean
  onRefresh: () => void
  onCopy: (text: string, successKey: string) => void
  onDownload: (text: string, mime: string, ext: string) => void
  onOpenBatch: () => void
}

export function MoreMenu({ rows, loading, onRefresh, onCopy, onDownload, onOpenBatch }: MoreMenuProps) {
  const { t } = useTranslation()
  const empty = rows.length === 0
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="outline"
          className="shrink-0"
          aria-label={t('bookmarks.exportMenu')}
          title={t('bookmarks.exportMenu')}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={loading} onSelect={onRefresh}>
          <RefreshCwIcon className="size-4" />
          {t('bookmarks.refresh')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {t('bookmarks.copyUrls')}
        </DropdownMenuLabel>
        <DropdownMenuItem disabled={empty} onSelect={() => onCopy(rows.map((r) => r.url).join('\n'), 'bookmarks.copied')}>
          <FileTextIcon className="size-4" />
          {t('bookmarks.copyUrls')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={empty}
          onSelect={() => onCopy(rows.map((r) => `${r.title}\t${r.url}`).join('\n'), 'bookmarks.copied')}
        >
          <FileTextIcon className="size-4" />
          {t('bookmarks.copyTitles')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={empty} onSelect={() => onCopy(exportBookmarksMarkdown(rows), 'bookmarks.markdownCopied')}>
          <FileTextIcon className="size-4" />
          {t('bookmarks.copyMarkdown')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={empty} onSelect={() => onCopy(exportBookmarksCsv(rows), 'bookmarks.copied')}>
          <FileSpreadsheetIcon className="size-4" />
          {t('bookmarks.copyCsv')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {t('bookmarks.downloadAs')}
        </DropdownMenuLabel>
        <DropdownMenuItem disabled={empty} onSelect={() => onDownload(exportBookmarksMarkdown(rows), 'text/markdown', 'md')}>
          <DownloadIcon className="size-4" />
          {t('bookmarks.exportMd')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={empty} onSelect={() => onDownload(exportBookmarksJson(rows), 'application/json', 'json')}>
          <FileJsonIcon className="size-4" />
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem disabled={empty} onSelect={() => onDownload(exportBookmarksCsv(rows), 'text/csv', 'csv')}>
          <FileSpreadsheetIcon className="size-4" />
          {t('bookmarks.exportCsv')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={empty} onSelect={() => onDownload(exportBookmarksHtml(rows), 'text/html', 'html')}>
          <FileCodeIcon className="size-4" />
          {t('bookmarks.exportHtml')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={empty} onSelect={onOpenBatch}>
          <LayersIcon className="size-4" />
          {t('bookmarks.openAllVisible', { count: Math.min(rows.length, OPEN_BATCH_LIMIT) })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
