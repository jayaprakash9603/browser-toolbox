import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon, RefreshCwIcon } from 'lucide-react'

import type { DownloadableResource } from '@/core/download-manager'
import { duplicateKey, filterDuplicates } from '@/core/download-manager'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/utils/cn'

import { enqueueDownloads } from './service'
import { DM_LIST_SCROLL } from './layout'

interface ResourcePickerProps {
  title: string
  resources: DownloadableResource[]
  loading?: boolean
  error?: string | null
  onRescan?: () => void
  pageUrl?: string
  filter?: (r: DownloadableResource) => boolean
  query?: string
}

export function ResourcePicker({ title, resources, loading, error, onRescan, pageUrl, filter, query = '' }: ResourcePickerProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [skipInfo, setSkipInfo] = useState<number | null>(null)

  const visible = useMemo(() => {
    let list = resources
    if (filter) list = list.filter(filter)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((r) => r.label.toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
    return list
  }, [resources, query, filter])

  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.url))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(visible.filter((r) => r.downloadable).map((r) => r.url)))
  }

  const downloadSelected = async () => {
    const picked = visible.filter((r) => selected.has(r.url) && r.downloadable)
    const { items: deduped, skipped } = filterDuplicates(
      picked.map((r) => ({ url: r.url, label: r.label })),
      new Set(),
      'skip',
    )
    setSkipInfo(skipped)
    if (deduped.length === 0) return
    setBusy(true)
    try {
      await enqueueDownloads(
        deduped.map((r) => ({
          url: r.url,
          pageUrl,
        })),
      )
    } finally {
      setBusy(false)
    }
  }

  const showLoadingShell = loading && resources.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {onRescan ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onRescan}
            disabled={loading}
            aria-label={t('downloadManager.rescan')}
            className="shrink-0"
          >
            <RefreshCwIcon className={cn('size-4', loading && 'animate-spin')} />
          </Button>
        ) : null}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{visible.length}</span>
      </div>
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
      {skipInfo ? (
        <p className="text-[11px] text-muted-foreground">{t('downloadManager.duplicatesSkipped', { count: skipInfo })}</p>
      ) : null}
      <div className="flex min-h-11 items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label={t('downloadManager.selectAll')} />
        <span className="text-xs font-medium">{t('downloadManager.selectedCount', { count: selected.size })}</span>
        <Button
          size="sm"
          className="ml-auto min-w-[7.5rem]"
          disabled={busy || selected.size === 0}
          onClick={() => void downloadSelected()}
        >
          <DownloadIcon className="size-3.5" />
          {t('downloadManager.downloadSelected')}
        </Button>
      </div>
      <div className={cn(DM_LIST_SCROLL, showLoadingShell && 'space-y-2')}>
        {showLoadingShell ? (
          <>
            <p className="sr-only" aria-live="polite">
              {t('downloadManager.loadingResources')}
            </p>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('downloadManager.emptyResources')}</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((r) => {
              const on = selected.has(r.url)
              return (
                <li key={duplicateKey(r.url, r.label)} className="list-none">
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border bg-card p-3 shadow-xs transition-colors',
                      !r.downloadable && 'opacity-60',
                    )}
                  >
                    <Checkbox
                      checked={on}
                      disabled={!r.downloadable}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (v) next.add(r.url)
                          else next.delete(r.url)
                          return next
                        })
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium leading-snug">{r.label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.domain || r.url}</p>
                      {r.reason ? (
                        <p className="text-[10px] leading-snug text-amber-700 dark:text-amber-400">{r.reason}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {r.ext || r.category}
                    </Badge>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
