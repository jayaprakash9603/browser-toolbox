import { useTranslation } from 'react-i18next'
import {
  CheckIcon,
  FileIcon,
  FolderOpenIcon,
  GlobeIcon,
  Layers3Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import { DEFAULT_MAX_PAGES, MAX_PAGES_CEILING } from '@/core/engines/htmlArchive'
import { NumberField } from '@/shared/components/NumberField'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

const LIMIT_PRESETS = [50, DEFAULT_MAX_PAGES, 1000, MAX_PAGES_CEILING] as const

function hostOf(url: string) {
  if (!url) return ''
  if (url.startsWith('file:')) return decodeURIComponent(url.split('/').slice(-2, -1)[0] ?? 'file')
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

interface PageCardProps {
  pageTitle: string
  pageUrl: string
  linkCount: number
  loading: boolean
  onRescan: () => void
}

export function PageCard({ pageTitle, pageUrl, linkCount, loading, onRescan }: PageCardProps) {
  const { t } = useTranslation()
  const isFile = pageUrl.startsWith('file:')
  const SiteIcon = isFile ? FileIcon : GlobeIcon
  const host = hostOf(pageUrl)

  return (
    <section className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <SiteIcon className="size-[18px]" aria-hidden />
        {loading && (
          <span className="absolute inset-0 animate-spin rounded-xl border-2 border-primary/0 border-t-primary motion-reduce:animate-none" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-5 font-semibold" title={pageTitle || undefined}>
          {pageTitle || (loading ? t('htmlBundle.ui.scanning') : t('htmlBundle.ui.noPage'))}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
          {host && (
            <span className="truncate" title={pageUrl}>
              {host}
            </span>
          )}
          {host && <span aria-hidden>·</span>}
          <span className="shrink-0 tabular-nums">{t('htmlBundle.ui.linksFound', { count: linkCount })}</span>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="hidden shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-ring @[380px]:flex dark:text-emerald-400"
          >
            <ShieldCheckIcon className="size-3" aria-hidden />
            {t('htmlBundle.ui.local')}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-60">{t('htmlBundle.privacy')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRescan}
            disabled={loading}
            aria-label={t('htmlBundle.ui.rescan')}
            className="shrink-0"
          >
            <RefreshCwIcon className={cn('size-4', loading && 'animate-spin motion-reduce:animate-none')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('htmlBundle.ui.rescan')}</TooltipContent>
      </Tooltip>
    </section>
  )
}

interface FilterBarProps {
  htmlOnly: boolean
  sameFolderOnly: boolean
  onHtmlOnly: (value: boolean) => void
  onSameFolderOnly: (value: boolean) => void
  pageLimit: number
  limitText: string
  onLimitText: (value: string) => void
  onLimitPreset: (value: number) => void
  busy: boolean
  isFilePage: boolean
  onScanFolder: () => void
  onPickFolder: () => void
}

export function FilterBar({
  htmlOnly,
  sameFolderOnly,
  onHtmlOnly,
  onSameFolderOnly,
  pageLimit,
  limitText,
  onLimitText,
  onLimitPreset,
  busy,
  isFilePage,
  onScanFolder,
  onPickFolder,
}: FilterBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t('htmlBundle.ui.filters')} className="flex flex-wrap items-center gap-1.5">
        <FilterChip
          active={htmlOnly}
          onToggle={() => onHtmlOnly(!htmlOnly)}
          label={t('htmlBundle.ui.filterHtml')}
          hint={t('htmlBundle.ui.filterHtmlHint')}
          searchId="htmlOnly"
        />
        <FilterChip
          active={sameFolderOnly}
          onToggle={() => onSameFolderOnly(!sameFolderOnly)}
          label={t('htmlBundle.ui.filterFolder')}
          hint={t('htmlBundle.ui.filterFolderHint')}
          searchId="sameFolderOnly"
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:border-primary/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary/40 data-[state=open]:text-foreground"
            >
              <Layers3Icon className="size-3.5" aria-hidden />
              <span className="tabular-nums">{t('htmlBundle.ui.limitChip', { count: pageLimit })}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium">{t('htmlBundle.pageLimit')}</span>
              <NumberField
                value={limitText}
                onChange={onLimitText}
                ariaLabel={t('htmlBundle.pageLimit')}
                min={1}
                max={MAX_PAGES_CEILING}
                disabled={busy}
                className="h-8 w-20 shrink-0 text-right text-xs"
              />
            </div>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {t('htmlBundle.pageLimitHint', { default: DEFAULT_MAX_PAGES, max: MAX_PAGES_CEILING })}
            </p>
            <p className="mt-3 mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {t('htmlBundle.ui.limitPresets')}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {LIMIT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={busy}
                  onClick={() => onLimitPreset(preset)}
                  aria-pressed={pageLimit === preset}
                  className={cn(
                    'h-8 rounded-md border text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                    pageLimit === preset
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary/35 hover:bg-primary/5',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isFilePage && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5">
          <span className="mr-auto text-[11px] font-medium text-muted-foreground">{t('htmlBundle.ui.folderTools')}</span>
          <Button size="xs" variant="secondary" onClick={onScanFolder} disabled={busy}>
            <FolderOpenIcon />
            {t('htmlBundle.scanFromFolder')}
          </Button>
          <Button size="xs" variant="secondary" onClick={onPickFolder} disabled={busy}>
            <FolderOpenIcon />
            {t('htmlBundle.pickFolder')}
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onToggle,
  label,
  hint,
  searchId,
}: {
  active: boolean
  onToggle: () => void
  label: string
  hint: string
  searchId: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={onToggle}
          data-search-id={searchId}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
            active
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
          )}
        >
          <span
            className={cn(
              'flex size-3.5 items-center justify-center rounded-full border transition-colors',
              active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
            )}
            aria-hidden
          >
            {active && <CheckIcon className="size-2.5" strokeWidth={3.5} />}
          </span>
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}
