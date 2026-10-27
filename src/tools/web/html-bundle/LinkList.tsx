import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRightIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FileTextIcon,
  FilesIcon,
  SaveIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from 'lucide-react'

import type { HtmlLinkCandidate } from '@/core/engines/htmlArchive'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

function folderOf(url: string) {
  try {
    const path = decodeURIComponent(new URL(url).pathname)
    const folder = path.slice(0, path.lastIndexOf('/') + 1)
    return folder.length > 1 ? folder : ''
  } catch {
    return ''
  }
}

interface LinkListProps {
  total: number
  filtered: HtmlLinkCandidate[]
  selected: ReadonlySet<string>
  selectAllState: boolean | 'indeterminate'
  query: string
  onQuery: (value: string) => void
  loading: boolean
  busy: boolean
  overLimit: boolean
  filtersOn: { htmlOnly: boolean; sameFolderOnly: boolean }
  onToggle: (id: string) => void
  onToggleAll: () => void
  onInvert: () => void
  onCopy: () => void
  onAllTypes: () => void
  onAnyFolder: () => void
  onSaveThisPage: () => void
}

export function LinkList({
  total,
  filtered,
  selected,
  selectAllState,
  query,
  onQuery,
  loading,
  busy,
  overLimit,
  filtersOn,
  onToggle,
  onToggleAll,
  onInvert,
  onCopy,
  onAllTypes,
  onAnyFolder,
  onSaveThisPage,
}: LinkListProps) {
  const { t } = useTranslation()
  const searching = query.trim().length > 0

  return (
    <section className="flex min-h-56 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-2 border-b p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t('htmlBundle.search')}
            aria-label={t('htmlBundle.search')}
            className="h-8 pr-8 pl-8 text-xs"
            disabled={total === 0}
          />
          {searching && (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label={t('htmlBundle.ui.clearSearch')}
              className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex min-h-7 items-center gap-2 px-0.5">
            <label className="flex min-w-0 cursor-pointer items-center gap-2 text-[11px] font-medium">
              <Checkbox checked={selectAllState} onCheckedChange={onToggleAll} aria-label={t('htmlBundle.selectAll')} />
              <span className="truncate">
                {searching ? t('htmlBundle.selectAllMatches', { count: filtered.length }) : t('htmlBundle.selectAll')}
              </span>
            </label>
            <span
              className={cn(
                'ml-auto shrink-0 text-[11px] tabular-nums',
                overLimit ? 'font-semibold text-destructive' : 'text-muted-foreground',
              )}
            >
              {t('htmlBundle.selectedCount', { count: selected.size, total })}
            </span>
            <IconAction label={t('htmlBundle.ui.invert')} onClick={onInvert} icon={ArrowLeftRightIcon} />
            <IconAction
              label={t('htmlBundle.ui.copyLinks')}
              onClick={onCopy}
              icon={CopyIcon}
              disabled={selected.size === 0}
            />
          </div>
        )}
      </div>

      <div className="scrollbar-styled min-h-0 flex-1 overflow-y-auto">
        {loading && total === 0 ? (
          <ul aria-hidden className="divide-y">
            {[72, 56, 64, 48, 60].map((width, index) => (
              <li key={index} className="flex items-center gap-2.5 px-2.5 py-2">
                <span className="size-4 rounded bg-muted motion-safe:animate-pulse" />
                <span className="size-7 rounded-lg bg-muted motion-safe:animate-pulse" />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="h-2.5 rounded bg-muted motion-safe:animate-pulse" style={{ width: `${width}%` }} />
                  <span className="h-2 w-1/3 rounded bg-muted/70 motion-safe:animate-pulse" />
                </span>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          searching ? (
            <Empty icon={SearchXIcon} title={t('htmlBundle.ui.noMatchTitle', { query: query.trim() })}>
              <Button size="sm" variant="outline" onClick={() => onQuery('')}>
                <XIcon />
                {t('htmlBundle.ui.clearSearch')}
              </Button>
            </Empty>
          ) : (
            <Empty
              icon={FilesIcon}
              title={t('htmlBundle.ui.emptyTitle')}
              body={
                filtersOn.htmlOnly || filtersOn.sameFolderOnly
                  ? t('htmlBundle.ui.emptyFiltered')
                  : t('htmlBundle.ui.emptyPlain')
              }
            >
              {filtersOn.htmlOnly && (
                <Button size="sm" variant="outline" onClick={onAllTypes}>
                  <FileCodeIcon />
                  {t('htmlBundle.ui.allTypes')}
                </Button>
              )}
              {filtersOn.sameFolderOnly && (
                <Button size="sm" variant="outline" onClick={onAnyFolder}>
                  <FilesIcon />
                  {t('htmlBundle.ui.anyFolder')}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onSaveThisPage} disabled={busy}>
                <SaveIcon />
                {t('htmlBundle.ui.saveThisPage')}
              </Button>
            </Empty>
          )
        ) : (
          <ul className="divide-y">
            {filtered.map((entry) => (
              <LinkRow
                key={entry.id}
                entry={entry}
                checked={selected.has(entry.resolvedUrl)}
                onToggle={() => onToggle(entry.resolvedUrl)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function LinkRow({ entry, checked, onToggle }: { entry: HtmlLinkCandidate; checked: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  const folder = folderOf(entry.resolvedUrl)
  return (
    <li
      className={cn(
        'group flex items-center gap-2.5 px-2.5 transition-colors hover:bg-accent/50',
        checked && 'bg-primary/[0.035]',
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2">
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={entry.label} />
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
            checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          <FileTextIcon className="size-3.5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-xs leading-4 font-medium">{entry.label}</span>
          <span className="truncate text-[11px] leading-4 text-muted-foreground" title={entry.resolvedUrl}>
            {folder && <span className="text-muted-foreground/70">{folder}</span>}
            <span className="text-foreground/75">{entry.filename}</span>
          </span>
        </span>
      </label>
      <a
        href={entry.resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('htmlBundle.ui.openLink', { name: entry.label })}
        title={t('htmlBundle.ui.openLink', { name: entry.label })}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 outline-none transition-[opacity,color,background-color] hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
      >
        <ExternalLinkIcon className="size-3.5" />
      </a>
    </li>
  )
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  disabled,
}: {
  label: string
  onClick: () => void
  icon: typeof CopyIcon
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label} className="shrink-0">
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function Empty({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof FilesIcon
  title: string
  body?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="relative mb-1 flex size-14 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rotate-6 rounded-2xl border bg-muted/60" />
        <span className="absolute inset-0 -rotate-6 rounded-2xl border bg-background" />
        <Icon className="relative size-6 text-muted-foreground" />
      </span>
      <p className="text-sm font-semibold text-balance">{title}</p>
      {body && <p className="max-w-64 text-xs leading-5 text-muted-foreground text-balance">{body}</p>}
      {children && <div className="mt-1 flex flex-wrap justify-center gap-1.5">{children}</div>}
    </div>
  )
}
