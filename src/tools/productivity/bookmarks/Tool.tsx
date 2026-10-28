import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'

import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { SearchInput } from '@/shared/components/SearchInput'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import { ProductivityToolActions } from '../_shared/ProductivityToolActions'
import { BookmarkExportPreview } from './BookmarkExportPreview'
import { BookmarkResultRow } from './BookmarkResultRow'
import {
  bookmarkFolderRoots,
  exportBookmarksJson,
  exportBookmarksMarkdown,
  filterBookmarkRows,
  folderMatchCount,
  searchBookmarks,
  sortBookmarkRows,
  type BookmarkRow,
  type BookmarkSort,
} from './service'

const HIGHLIGHT_MS = 1400

export default function BookmarksTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.bookmarks')
  const { show: showToast } = useToast()
  const granted = usePermissionGranted({ permissions: ['bookmarks'] })
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<string | 'all'>('all')
  const [sort, setSort] = useState<BookmarkSort>('recent')
  const [rows, setRows] = useState<BookmarkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (!chrome.bookmarks?.search) {
      setError(t('bookmarks.unavailable'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRows(await searchBookmarks(query))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('bookmarks.loadError'))
    } finally {
      setLoading(false)
    }
  }, [query, t])

  useEffect(() => {
    if (granted !== true) return
    const timer = window.setTimeout(() => void load(), query ? 220 : 0)
    return () => window.clearTimeout(timer)
  }, [granted, load, query])

  useEffect(() => {
    setFolder('all')
  }, [query])

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    },
    [],
  )

  const folderRoots = useMemo(() => bookmarkFolderRoots(rows), [rows])
  const filtered = useMemo(() => filterBookmarkRows(rows, folder), [rows, folder])
  const visible = useMemo(() => sortBookmarkRows(filtered, sort), [filtered, sort])

  const flashRow = (id: string) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    setHighlightId(id)
    highlightTimer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
  }

  const copyText = (text: string, successKey: string, rowId?: string) => {
    void navigator.clipboard.writeText(text).then(
      () => {
        if (rowId) flashRow(rowId)
        showToast(t(successKey))
      },
      () => showToast(t('bookmarks.copyFailed'), { variant: 'error' }),
    )
  }

  const copyUrls = () => copyText(visible.map((r) => r.url).join('\n'), 'bookmarks.copied')
  const copyTitles = () =>
    copyText(visible.map((r) => `${r.title}\t${r.url}`).join('\n'), 'bookmarks.copied')
  const copyMarkdown = () => copyText(exportBookmarksMarkdown(visible), 'bookmarks.markdownCopied')

  const exportMd = () => {
    downloadBlob(
      new Blob([exportBookmarksMarkdown(visible)], { type: 'text/markdown' }),
      `bookmarks-${new Date().toISOString().slice(0, 10)}.md`,
    )
    showToast(t('bookmarks.copied'))
  }

  const exportJson = () => {
    downloadBlob(
      new Blob([exportBookmarksJson(visible)], { type: 'application/json' }),
      `bookmarks-${new Date().toISOString().slice(0, 10)}.json`,
    )
    showToast(t('bookmarks.copied'))
  }

  const statusLabel =
    folder === 'all' && visible.length === rows.length
      ? t('bookmarks.summary', { count: visible.length })
      : t('bookmarks.summaryFiltered', { visible: visible.length, total: rows.length })

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <PermissionNotice active permissions={['bookmarks']} origins={[]} message={t('bookmarks.permission')} />

      <ToolSearchLayout
        header={
          <>
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('bookmarks.search')}
                ariaLabel={t('bookmarks.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={t('bookmarks.refresh')}
                title={t('bookmarks.refresh')}
                onClick={() => void load()}
                disabled={loading || granted !== true}
              >
                <RefreshCwIcon className={cn('size-4', loading && 'animate-spin')} />
              </Button>
            </div>

            <ProductivityToolActions>
              <Button size="xs" variant="secondary" disabled={!visible.length} onClick={copyUrls}>
                {t('bookmarks.copyUrls')}
              </Button>
              <Button size="xs" variant="outline" disabled={!visible.length} onClick={copyTitles}>
                {t('bookmarks.copyTitles')}
              </Button>
              <Button size="xs" variant="outline" disabled={!visible.length} onClick={copyMarkdown}>
                {t('bookmarks.copyMarkdown')}
              </Button>
              <Button size="xs" variant="outline" disabled={!visible.length} onClick={exportMd}>
                <DownloadIcon />
                {t('bookmarks.exportMd')}
              </Button>
              <Button size="xs" variant="outline" disabled={!visible.length} onClick={exportJson}>
                <DownloadIcon />
                JSON
              </Button>
            </ProductivityToolActions>

            {visible.length > 0 && (
              <BookmarkExportPreview rows={visible} onCopy={copyMarkdown} />
            )}

            <Segmented
              value={sort}
              onValueChange={(value) => setSort(value as BookmarkSort)}
              ariaLabel={t('bookmarks.sort')}
              size="sm"
              className="w-full flex-wrap"
              options={(['recent', 'title', 'folder'] as const).map((value) => ({
                value,
                label: t(`bookmarks.sort.${value}`),
              }))}
            />

            {folderRoots.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('bookmarks.folders')}
                </p>
                <div
                  className="scrollbar-styled flex flex-wrap gap-1 pb-0.5"
                  role="tablist"
                  aria-label={t('bookmarks.folders')}
                >
                  <FolderChip
                    active={folder === 'all'}
                    onClick={() => setFolder('all')}
                    label={t('bookmarks.allFolders')}
                    count={rows.length}
                  />
                  {folderRoots.map((root) => (
                    <FolderChip
                      key={root}
                      active={folder === root}
                      onClick={() => setFolder(root)}
                      label={root}
                      count={folderMatchCount(rows, root)}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}
          </>
        }
        footer={<ProductivityStatusBar>{statusLabel}</ProductivityStatusBar>}
        bodyClassName="pb-3 pt-2.5"
      >
        {loading && rows.length === 0 ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-[4.25rem] animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <SearchIcon className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium">{t('bookmarks.emptyTitle')}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t('bookmarks.emptyHint')}</p>
          </div>
        ) : (
          <StaggerChildren className="space-y-1.5" stagger={0.03}>
            {visible.map((row) => (
              <StaggerItem key={row.id}>
                <BookmarkResultRow
                  row={row}
                  highlighted={highlightId === row.id}
                  onCopyUrl={() => copyText(row.url, 'bookmarks.copied', row.id)}
                  onCopyMarkdown={() =>
                    copyText(exportBookmarksMarkdown([row]), 'bookmarks.markdownCopied', row.id)
                  }
                  onOpen={() => void chrome.tabs.create({ url: row.url, active: true })}
                />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>
    </ToolPage>
  )
}

function FolderChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted',
      )}
    >
      <span className="max-w-[8rem] truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-px text-[9px] tabular-nums',
          active ? 'bg-primary/15 text-primary' : 'bg-background/80 text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}
