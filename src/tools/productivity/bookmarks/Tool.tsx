import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookmarkIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import { ProductivityToolActions } from '../_shared/ProductivityToolActions'
import {
  bookmarkFolderRoots,
  exportBookmarksJson,
  exportBookmarksMarkdown,
  filterBookmarkRows,
  searchBookmarks,
  type BookmarkRow,
} from './service'

export default function BookmarksTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.bookmarks')
  const reduce = useReducedMotion()
  const granted = usePermissionGranted({ permissions: ['bookmarks'] })
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState<string | 'all'>('all')
  const [rows, setRows] = useState<BookmarkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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

  const folderRoots = useMemo(() => bookmarkFolderRoots(rows), [rows])
  const visible = useMemo(() => filterBookmarkRows(rows, folder), [rows, folder])

  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 2600)
  }

  const copyUrls = () => {
    void navigator.clipboard.writeText(visible.map((r) => r.url).join('\n'))
    notify(t('bookmarks.copied'))
  }

  const copyTitles = () => {
    void navigator.clipboard.writeText(visible.map((r) => `${r.title}\t${r.url}`).join('\n'))
    notify(t('bookmarks.copied'))
  }

  const exportMd = () => {
    downloadBlob(
      new Blob([exportBookmarksMarkdown(visible)], { type: 'text/markdown' }),
      `bookmarks-${new Date().toISOString().slice(0, 10)}.md`,
    )
  }

  const exportJson = () => {
    downloadBlob(
      new Blob([exportBookmarksJson(visible)], { type: 'application/json' }),
      `bookmarks-${new Date().toISOString().slice(0, 10)}.json`,
    )
  }

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
                <CopyIcon />
                {t('bookmarks.copyUrls')}
              </Button>
              <Button size="xs" variant="outline" disabled={!visible.length} onClick={copyTitles}>
                <CopyIcon />
                {t('bookmarks.copyTitles')}
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
            {folderRoots.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('bookmarks.folders')}
                </p>
                <div className="scrollbar-styled flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label={t('bookmarks.folders')}>
                  <FolderChip active={folder === 'all'} onClick={() => setFolder('all')} label={t('bookmarks.allFolders')} />
                  {folderRoots.map((root) => (
                    <FolderChip key={root} active={folder === root} onClick={() => setFolder(root)} label={root} />
                  ))}
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </>
        }
        footer={
          <ProductivityStatusBar>
            {toast ? (
              <p role="status" className="text-center text-xs font-medium text-foreground">
                {toast}
              </p>
            ) : (
              t('bookmarks.summary', { count: visible.length })
            )}
          </ProductivityStatusBar>
        }
        bodyClassName="pb-3 pt-2.5"
      >
        {loading && rows.length === 0 ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <SearchIcon className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium">{t('bookmarks.emptyTitle')}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t('bookmarks.emptyHint')}</p>
          </div>
        ) : (
          <StaggerChildren className="space-y-1.5" stagger={0.035}>
            {visible.map((row) => (
              <StaggerItem key={row.id}>
                <motion.div
                  layout={!reduce}
                  className="group flex items-start gap-2 rounded-xl border bg-card p-2.5 shadow-xs transition-shadow hover:border-primary/30 hover:shadow-sm"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookmarkIcon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">{row.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.folderPath}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground/80">{row.url}</p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                    aria-label={t('bookmarks.open')}
                    onClick={() => void chrome.tabs.create({ url: row.url, active: true })}
                  >
                    <ExternalLinkIcon />
                  </Button>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>
    </ToolPage>
  )
}

function FolderChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  )
}
