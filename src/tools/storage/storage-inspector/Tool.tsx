import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  DatabaseIcon,
  DownloadIcon,
  FileJsonIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RadioIcon,
  RefreshCwIcon,
  SearchXIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'

import {
  VALUE_KINDS,
  exportJson,
  filterEntries,
  formatBytes,
  kindCounts,
  parseImport,
  toEntries,
  totalBytes,
  type SortKey,
  type StorageEntry,
  type ValueKind,
} from '@/core/storage-inspector/model'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import { useStorageTool } from '../_shared'
import { AddEntryDialog, ClearAreaDialog } from './Dialogs'
import { EntryRow } from './EntryRow'
import { useStorageData } from './hooks'
import './i18n'

const PAGE_SIZE = 60
const AREAS = ['local', 'session'] as const

interface Notice {
  id: number
  text: string
  actionLabel?: string
  onAction?: () => void
}

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function StorageInspectorTool() {
  const { t } = useTranslation()
  const tool = useStorageTool('storage.inspector')
  const reduce = useReducedMotion()
  const [area, setArea] = useDeepLinkTab('tab', AREAS, 'local')
  const [live, setLive] = useState(false)
  const { snapshot, loaded, refreshing, refresh, write } = useStorageData(live)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [kind, setKind] = useState<ValueKind | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [addOpen, setAddOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef(0)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const say = useCallback((text: string, action?: Pick<Notice, 'actionLabel' | 'onAction'>) => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ id: Date.now(), text, ...action })
    noticeTimer.current = window.setTimeout(() => setNotice(null), action ? 6000 : 2200)
  }, [])

  const record = useMemo(
    () => (snapshot ? (area === 'local' ? snapshot.localStorage : snapshot.sessionStorage) : {}),
    [snapshot, area],
  )
  const entries = useMemo(() => toEntries(record), [record])
  const counts = useMemo(() => kindCounts(entries), [entries])
  const visible = useMemo(() => filterEntries(entries, query, kind, sort), [entries, query, kind, sort])
  const bytes = useMemo(() => totalBytes(entries), [entries])
  const areaLabel = area === 'local' ? 'localStorage' : 'sessionStorage'
  const filtersActive = query.trim() !== '' || kind !== 'all'

  // A filter that no longer matches anything (after edits or switching areas) should not trap the user.
  useEffect(() => {
    if (kind !== 'all' && !counts[kind]) setKind('all')
  }, [counts, kind])
  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [area, query, kind, sort])
  useEffect(() => {
    setExpanded(null)
    setEditing(null)
  }, [area])

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        say(t('storage.copied'))
      } catch {
        say(t('storage.writeFailed'))
      }
    },
    [say, t],
  )

  const setValue = useCallback(
    async (key: string, value: string) => {
      const ok = await write({ area, op: 'set', key, value })
      if (ok) say(t('storage.saved', { key }))
      else say(t('storage.writeFailed'))
      return ok
    },
    [area, say, t, write],
  )

  const onSave = useCallback(
    async (key: string, value: string) => {
      if (await setValue(key, value)) setEditing(null)
    },
    [setValue],
  )

  const onDelete = useCallback(
    async (entry: StorageEntry) => {
      if (!(await write({ area, op: 'remove', key: entry.key }))) {
        say(t('storage.writeFailed'))
        return
      }
      setEditing((current) => (current === entry.key ? null : current))
      say(t('storage.deleted', { key: entry.key }), {
        actionLabel: t('storage.undo'),
        onAction: () => {
          void write({ area, op: 'set', key: entry.key, value: entry.value }).then(() =>
            say(t('storage.restored', { key: entry.key })),
          )
        },
      })
    },
    [area, say, t, write],
  )

  const onToggle = useCallback((key: string) => {
    setExpanded((current) => (current === key ? null : key))
    setEditing((current) => (current === key ? current : null))
  }, [])

  const onEdit = useCallback((key: string | null) => {
    setEditing(key)
    if (key) setExpanded(key)
  }, [])

  const addEntry = async (key: string, value: string) => {
    if (await setValue(key, value)) {
      setAddOpen(false)
      setQuery('')
      setKind('all')
      setExpanded(key)
    }
  }

  const clearArea = async () => {
    const previous = { ...record }
    const label = areaLabel
    setClearOpen(false)
    if (!(await write({ area, op: 'clear' }))) {
      say(t('storage.writeFailed'))
      return
    }
    say(t('storage.cleared', { area: label }), {
      actionLabel: t('storage.undo'),
      onAction: () => {
        void write({ area, op: 'merge', entries: previous }).then(() =>
          say(t('storage.restoredAll', { count: Object.keys(previous).length })),
        )
      },
    })
  }

  const onImportFile = async (file: File | undefined) => {
    if (!file) return
    const result = parseImport(await file.text())
    if (!result.ok) {
      say(t(result.error === 'invalid' ? 'storage.importInvalid' : result.error === 'shape' ? 'storage.importShape' : 'storage.importEmpty'))
      return
    }
    if (await write({ area, op: 'merge', entries: result.entries })) {
      say(t('storage.imported', { count: Object.keys(result.entries).length }))
    } else say(t('storage.writeFailed'))
  }

  const exportName = () => `${area}Storage-${(snapshot?.origin ?? 'page').replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '-')}.json`

  const present = VALUE_KINDS.filter((k) => counts[k])
  const readable = loaded && snapshot !== null

  const header = readable ? (
    <>
      <div className="flex items-center gap-1.5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('storage.searchPlaceholder')}
          ariaLabel={t('common.search')}
          shortcut="/"
          className="min-w-0 flex-1"
        />
        <Button size="icon-sm" variant="ghost" onClick={() => void refresh()} aria-label={t('storage.refresh')} title={t('storage.refresh')}>
          <RefreshCwIcon className={cn(refreshing && 'animate-spin motion-reduce:animate-none')} />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => setAddOpen(true)} aria-label={t('storage.add')} title={t('storage.add')}>
          <PlusIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={t('storage.more')} title={t('storage.more')}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={() => { const name = exportName(); download(exportJson(record), name); say(t('storage.downloaded', { name })) }} disabled={entries.length === 0}>
              <DownloadIcon /> {t('storage.exportJson')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void copy(exportJson(record))} disabled={entries.length === 0}>
              <FileJsonIcon /> {t('storage.copyJson')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => importRef.current?.click()}>
              <UploadIcon /> {t('storage.import')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500 focus:text-red-500" onSelect={() => setClearOpen(true)} disabled={entries.length === 0}>
              <Trash2Icon /> {t('storage.clearArea', { area: areaLabel })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void onImportFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          value={area}
          onValueChange={setArea}
          ariaLabel={t('storage.area.label')}
          options={AREAS.map((value) => ({
            value,
            label: (
              <>
                {value === 'local' ? 'localStorage' : 'sessionStorage'}
                <span className="ml-1 rounded bg-foreground/10 px-1 text-[10px] tabular-nums">
                  {Object.keys(value === 'local' ? snapshot.localStorage : snapshot.sessionStorage).length}
                </span>
              </>
            ),
          }))}
        />
        <Segmented
          size="sm"
          value={sort}
          onValueChange={setSort}
          ariaLabel={t('storage.sort.label')}
          className="ml-auto"
          options={(['name', 'size', 'type'] as const).map((value) => ({ value, label: t(`storage.sort.${value}`) }))}
        />
      </div>

      {present.length > 1 && (
        <div role="group" aria-label={t('storage.kind.label')} className="scrollbar-styled -mb-0.5 flex gap-1 overflow-x-auto pb-1">
          {(['all', ...present] as const).map((value) => {
            const active = kind === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(value)}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {t(`storage.kind.${value}`)}
                <span className="ml-1 tabular-nums opacity-70">{value === 'all' ? entries.length : counts[value]}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span aria-live="polite" className="tabular-nums">
          {filtersActive
            ? t('storage.shown', { shown: visible.length, total: entries.length })
            : t('storage.entryCount', { count: entries.length })}
          {' · '}
          {t('storage.size', { size: formatBytes(bytes) })}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5" title={t('storage.autoRefreshHint')}>
          <RadioIcon className={cn('size-3', live && 'text-green-500')} aria-hidden />
          {t('storage.autoRefresh')}
          <Switch checked={live} onCheckedChange={setLive} aria-label={t('storage.autoRefresh')} />
        </label>
      </div>
    </>
  ) : undefined

  const footer = (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {notice?.text ?? ''}
      </div>
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute inset-x-3 bottom-3 z-20 mx-auto flex w-fit max-w-full items-center gap-2 rounded-xl border bg-popover/95 py-1.5 pr-1.5 pl-3 text-xs shadow-lg backdrop-blur-md"
          >
            <span className="min-w-0 truncate">{notice.text}</span>
            {notice.onAction && (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  notice.onAction?.()
                }}
              >
                {notice.actionLabel}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <ToolSearchLayout header={header} footer={footer} bodyClassName="py-3">
        {!loaded ? (
          <ul className="flex flex-col gap-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
            ))}
          </ul>
        ) : !snapshot ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
            <ShieldAlertIcon className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t('storage.noAccess')}</p>
            <p className="text-xs text-muted-foreground">{t('storage.noAccessHint')}</p>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              <RefreshCwIcon /> {t('storage.retry')}
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
            <DatabaseIcon className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t('storage.emptyArea')}</p>
            <p className="text-xs text-muted-foreground">{t('storage.emptyHint')}</p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon /> {t('storage.add')}
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <SearchXIcon className="size-7 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">{t('storage.noMatches')}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery('')
                setKind('all')
              }}
            >
              {t('storage.clearFilters')}
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5 pb-14">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.slice(0, limit).map((entry) => (
                <EntryRow
                  key={entry.key}
                  entry={entry}
                  expanded={expanded === entry.key}
                  editing={editing === entry.key}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onSave={(key, value) => void onSave(key, value)}
                  onDelete={(row) => void onDelete(row)}
                  onCopy={(text) => void copy(text)}
                />
              ))}
            </AnimatePresence>
            {visible.length > limit && (
              <li>
                <Button variant="outline" size="sm" className="w-full text-muted-foreground" onClick={() => setLimit((v) => v + PAGE_SIZE)}>
                  {t('storage.showMore', { count: Math.min(PAGE_SIZE, visible.length - limit) })}
                </Button>
              </li>
            )}
          </ul>
        )}
      </ToolSearchLayout>

      <AddEntryDialog
        open={addOpen}
        areaLabel={areaLabel}
        existingKeys={new Set(Object.keys(record))}
        onClose={() => setAddOpen(false)}
        onSubmit={(key, value) => void addEntry(key, value)}
      />
      <ClearAreaDialog
        open={clearOpen}
        areaLabel={areaLabel}
        count={entries.length}
        onClose={() => setClearOpen(false)}
        onConfirm={() => void clearArea()}
      />
    </ToolPage>
  )
}