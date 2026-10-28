import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'

import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { downloadBlob } from '@/features/netmon/download'
import { ToolPage } from '@/shared/components/ToolPage'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { exportBookmarksJson, exportBookmarksMarkdown, searchBookmarks, type BookmarkRow } from './service'

export default function BookmarksTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.bookmarks')
  const granted = usePermissionGranted({ permissions: ['bookmarks'] })
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<BookmarkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const copyUrls = () => {
    void navigator.clipboard.writeText(rows.map((r) => r.url).join('\n'))
  }

  const exportMd = () => {
    downloadBlob(
      new Blob([exportBookmarksMarkdown(rows)], { type: 'text/markdown' }),
      `bookmarks-${new Date().toISOString().slice(0, 10)}.md`,
    )
  }

  const exportJson = () => {
    downloadBlob(new Blob([exportBookmarksJson(rows)], { type: 'application/json' }), `bookmarks-${new Date().toISOString().slice(0, 10)}.json`)
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col gap-2.5 overflow-hidden">
      <PermissionNotice active permissions={['bookmarks']} origins={[]} message={t('bookmarks.permission')} />

      <div className="flex items-center gap-1.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('bookmarks.search')}
          ariaLabel={t('bookmarks.search')}
          className="flex-1"
        />
        <Button size="icon-sm" variant="ghost" aria-label={t('bookmarks.refresh')} title={t('bookmarks.refresh')} onClick={() => void load()} disabled={loading}>
          <RefreshCwIcon className={cn(loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" variant="secondary" disabled={!rows.length} onClick={copyUrls}>
          <CopyIcon />
          {t('bookmarks.copyUrls')}
        </Button>
        <Button size="xs" variant="outline" disabled={!rows.length} onClick={exportMd}>
          <DownloadIcon />
          {t('bookmarks.exportMd')}
        </Button>
        <Button size="xs" variant="outline" disabled={!rows.length} onClick={exportJson}>
          <DownloadIcon />
          JSON
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="scrollbar-styled -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {loading && rows.length === 0 ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <SearchIcon className="size-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium">{t('bookmarks.emptyTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('bookmarks.emptyHint')}</p>
          </div>
        ) : (
          <StaggerChildren className="space-y-1.5" stagger={0.035}>
            {rows.map((row) => (
              <StaggerItem key={row.id}>
                <div className="group flex items-start gap-2 rounded-xl border bg-card p-2.5 transition-colors hover:border-primary/30 hover:bg-accent/20">
                  <BookmarkIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.folderPath}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground/80">{row.url}</p>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="shrink-0 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                    aria-label={t('bookmarks.open')}
                    onClick={() => void chrome.tabs.create({ url: row.url, active: true })}
                  >
                    <ExternalLinkIcon />
                  </Button>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </div>

      <p className="text-[10.5px] text-muted-foreground tabular-nums">{t('bookmarks.summary', { count: rows.length })}</p>
    </ToolPage>
  )
}
