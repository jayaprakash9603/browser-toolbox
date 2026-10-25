import {
  AlertCircleIcon,
  ArchiveRestoreIcon,
  CheckCircle2Icon,
  FileCode2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isBroadMatch } from '@/core/script-studio/match'
import type { ScriptRecord, TabScriptRuns } from '@/core/script-studio'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

type SortKey = 'name' | 'updatedAt' | 'size' | 'enabled'
type View = 'installed' | 'trash'

type Props = {
  scripts: ScriptRecord[]
  onToggle: (record: ScriptRecord, enabled: boolean) => void
  onSelect: (id: string) => void
  onTrash: (ids: string[]) => void
  onRestore?: (id: string) => void
  onBulkEnable: (ids: string[], enabled: boolean) => void
  onCheckUpdates: (ids: string[]) => void
  loadCode: (id: string) => Promise<string | null>
  onCreate?: () => void
  onBrowseGallery?: () => void
  /** Execution results for the active tab; rows that ran there get a status pill. */
  runs?: TabScriptRuns
}

function matchSearch(query: string, text: string): boolean {
  if (!query) return true
  try {
    return new RegExp(query, 'i').test(text)
  } catch {
    return text.toLowerCase().includes(query.toLowerCase())
  }
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

export function LibraryView({
  scripts,
  onToggle,
  onSelect,
  onTrash,
  onRestore,
  onBulkEnable,
  onCheckUpdates,
  loadCode,
  onCreate,
  onBrowseGallery,
  runs,
}: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [view, setView] = useState<View>('installed')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const trashCount = scripts.filter((s) => s.trashed).length
  const installedCount = scripts.length - trashCount
  const activeView: View = view === 'trash' && trashCount === 0 ? 'installed' : view
  const trash = activeView === 'trash'

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const s of scripts) for (const tag of s.overrides.tags ?? []) set.add(tag)
    return [...set]
  }, [scripts])

  const filtered = useMemo(() => {
    let list = scripts.filter((s) => (trash ? s.trashed : !s.trashed))
    if (tagFilter) list = list.filter((s) => s.overrides.tags?.includes(tagFilter))
    list = list.filter((s) => matchSearch(query, `${s.name} ${s.version}`))
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'size') return b.size - a.size
      if (sort === 'enabled') return Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name)
      return b.updatedAt - a.updatedAt
    })
  }, [scripts, trash, query, sort, tagFilter])

  const visibleSelected = filtered.filter((s) => selected.has(s.id)).map((s) => s.id)
  const allSelected = filtered.length > 0 && visibleSelected.length === filtered.length

  const toggleSelected = (id: string, on: boolean) => {
    const next = new Set(selected)
    if (on) next.add(id)
    else next.delete(id)
    setSelected(next)
  }

  const onDropFiles = (files: FileList | null) => {
    if (!files?.length) return
    void (async () => {
      for (const file of files) {
        if (!file.name.endsWith('.user.js')) continue
        const text = await file.text()
        const { createScriptId, recordFromSource, upsertScriptRecord } = await import('@/core/script-studio')
        const { sendMessage } = await import('@/core/messaging')
        const id = createScriptId()
        await upsertScriptRecord(recordFromSource(id, text), text)
        await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
      }
    })()
  }

  if (installedCount === 0 && trashCount === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onDropFiles(e.dataTransfer.files)
        }}
      >
        <EmptyState className="py-0" icon={FileCode2Icon} title={t('scriptStudio.library.emptyTitle')} description={t('scriptStudio.library.emptyHint')} />
        <div className="flex flex-wrap justify-center gap-2">
          {onBrowseGallery ? (
            <Button size="sm" className="min-h-9 gap-1.5" onClick={onBrowseGallery}>
              <SparklesIcon className="size-4" aria-hidden />
              {t('scriptStudio.library.browseGallery')}
            </Button>
          ) : null}
          {onCreate ? (
            <Button size="sm" variant="outline" className="min-h-9 gap-1.5" onClick={onCreate}>
              <PlusIcon className="size-4" aria-hidden />
              {t('scriptStudio.create')}
            </Button>
          ) : null}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UploadIcon className="size-3.5" aria-hidden />
          {t('scriptStudio.library.dropHint')}
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropFiles(e.dataTransfer.files)
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {trashCount > 0 ? (
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1" role="group" aria-label={t('scriptStudio.library.view')}>
            {(['installed', 'trash'] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeView === id}
                onClick={() => {
                  setView(id)
                  setSelected(new Set())
                }}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  activeView === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {id === 'trash' ? <Trash2Icon className="size-3.5" aria-hidden /> : null}
                {t(`scriptStudio.library.views.${id}`)}
                <span className="tabular-nums opacity-70">{id === 'trash' ? trashCount : installedCount}</span>
              </button>
            ))}
          </div>
        ) : null}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('scriptStudio.library.search')}
          className="min-w-[180px] flex-1"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger size="sm" className="w-[130px]" aria-label={t('scriptStudio.library.sort')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t('scriptStudio.library.sortBy.name')}</SelectItem>
            <SelectItem value="enabled">{t('scriptStudio.library.sortBy.enabled')}</SelectItem>
            <SelectItem value="updatedAt">{t('scriptStudio.library.sortBy.updatedAt')}</SelectItem>
            <SelectItem value="size">{t('scriptStudio.library.sortBy.size')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tags.length > 0 && !trash ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={tagFilter === tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                tagFilter === tag ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="flex items-center gap-2 px-3 text-[11px] text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(c) => setSelected(c ? new Set(filtered.map((s) => s.id)) : new Set())}
            aria-label={t('scriptStudio.library.selectAll')}
          />
          <span>
            {visibleSelected.length > 0
              ? t('scriptStudio.library.selected', { count: visibleSelected.length })
              : t('scriptStudio.library.count', { count: filtered.length })}
          </span>
        </div>
      ) : (
        <EmptyState icon={FileCode2Icon} title={t('scriptStudio.library.noMatch')} />
      )}

      <ul className="flex flex-col gap-1.5">
        {filtered.map((s, i) => (
          <motion.li
            key={s.id}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : Math.min(i, 10) * 0.02, duration: 0.18 }}
            className={cn(
              'flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:border-primary/30',
              selected.has(s.id) && 'border-primary/40 bg-primary/5',
            )}
          >
            <Checkbox
              checked={selected.has(s.id)}
              onCheckedChange={(c) => toggleSelected(s.id, Boolean(c))}
              aria-label={s.name}
            />
            <button
              type="button"
              className="min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => onSelect(s.id)}
            >
              <p className="flex min-w-0 items-center gap-1.5">
                <span className={cn('truncate text-sm font-medium', !s.enabled && !trash && 'text-muted-foreground')}>{s.name}</span>
                {!trash && runs?.[s.id] ? <RanHerePill failed={runs[s.id].status === 'error'} /> : null}
              </p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
                <span>v{s.version}</span>
                <span aria-hidden>·</span>
                <span>{formatSize(s.size)}</span>
                <span aria-hidden>·</span>
                <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                <BroadBadge scriptId={s.id} loadCode={loadCode} />
                {(s.overrides.tags ?? []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                    {tag}
                  </Badge>
                ))}
              </p>
            </button>
            {trash ? (
              onRestore ? (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => onRestore(s.id)}>
                  <ArchiveRestoreIcon className="size-3.5" aria-hidden />
                  {t('scriptStudio.library.restore')}
                </Button>
              ) : null
            ) : (
              <Switch checked={s.enabled} onCheckedChange={(on) => onToggle(s, on)} aria-label={s.name} />
            )}
            {!trash ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t('scriptStudio.library.actions', { name: s.name })}>
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onSelect(s.id)}>
                    <PencilIcon className="size-4" />
                    {t('scriptStudio.library.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onCheckUpdates([s.id])}>
                    <RefreshCwIcon className="size-4" />
                    {t('scriptStudio.library.bulk.update')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onTrash([s.id])}>
                    <Trash2Icon className="size-4" />
                    {t('scriptStudio.library.bulk.trash')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {visibleSelected.length > 0 ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, transition: { duration: 0.12 } }}
            className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-2 shadow-md backdrop-blur"
          >
            <span className="px-1 text-xs font-medium">{t('scriptStudio.library.selected', { count: visibleSelected.length })}</span>
            <div className="ms-auto flex flex-wrap gap-1.5">
              {trash ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    visibleSelected.forEach((id) => onRestore?.(id))
                    setSelected(new Set())
                  }}
                >
                  {t('scriptStudio.library.restore')}
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="secondary" onClick={() => onBulkEnable(visibleSelected, true)}>
                    {t('scriptStudio.library.bulk.enable')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onBulkEnable(visibleSelected, false)}>
                    {t('scriptStudio.library.bulk.disable')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onCheckUpdates(visibleSelected)}>
                    {t('scriptStudio.library.bulk.update')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onTrash(visibleSelected)
                      setSelected(new Set())
                    }}
                  >
                    {t('scriptStudio.library.bulk.trash')}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function RanHerePill({ failed }: { failed: boolean }) {
  const { t } = useTranslation()
  const Icon = failed ? AlertCircleIcon : CheckCircle2Icon
  return (
    <span
      className={cn(
        'inline-flex h-4 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-medium',
        failed ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      )}
    >
      <Icon className="size-2.5" aria-hidden />
      {failed ? t('scriptStudio.runs.libraryError') : t('scriptStudio.runs.libraryRan')}
    </span>
  )
}

function BroadBadge({ scriptId, loadCode }: { scriptId: string; loadCode: (id: string) => Promise<string | null> }) {
  const { t } = useTranslation()
  const [broad, setBroad] = useState(false)
  useEffect(() => {
    let cancelled = false
    void loadCode(scriptId).then((code) => {
      if (!code || cancelled) return
      void import('@/core/script-studio/metadata').then(({ parseMetadata }) => {
        const m = parseMetadata(code)
        if (!cancelled && m && isBroadMatch([...m.matches, ...m.includes])) setBroad(true)
      })
    })
    return () => {
      cancelled = true
    }
  }, [scriptId, loadCode])
  if (!broad) return null
  return (
    <Badge variant="outline" className="h-4 border-amber-500/40 px-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">
      {t('scriptStudio.library.allSites')}
    </Badge>
  )
}
