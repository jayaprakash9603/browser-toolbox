import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookmarkPlusIcon,
  CheckCheckIcon,
  ChevronDownIcon,
  FileDownIcon,
  FileJsonIcon,
  FilesIcon,
  FileSpreadsheetIcon,
  LibraryIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { downloadBlob } from '@/features/netmon/download'
import { subscribePayload, type ToolPayload } from '@/core/payloads'
import { ChipRail } from '@/shared/components/ChipRail'
import { SearchInput } from '@/shared/components/SearchInput'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { useToast } from '@/shared/components/toast/useToast'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import './i18n'
import {
  exportReadingCsv,
  exportReadingMarkdown,
  filterReadingList,
  loadReadingList,
  mergeImportedReading,
  newReadingItem,
  parseReadingTags,
  readingCounts,
  readingProgress,
  readingTags,
  saveReadingList,
  sortReadingList,
  type ReadingFilter,
  type ReadingItem,
  type ReadingSort,
} from './model'
import { ReadingEditDialog } from './ReadingEditDialog'
import { ReadingItemCard } from './ReadingItemCard'
import { PendingExcerpt } from './PendingExcerpt'

async function readActiveTab(): Promise<{ url: string; title: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url || !/^https?:/i.test(tab.url)) return null
  return { url: tab.url, title: tab.title ?? tab.url }
}

export default function ReadingListTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.reading-list')
  const reduce = useReducedMotion()
  const { show: showToast } = useToast()
  const [items, setItems] = useState<ReadingItem[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ReadingFilter>('all')
  const [sort, setSort] = useState<ReadingSort>('newest')
  const [tag, setTag] = useState<string | 'all'>('all')
  const [loaded, setLoaded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [editing, setEditing] = useState<ReadingItem | null>(null)
  const [pendingExcerpt, setPendingExcerpt] = useState<ToolPayload | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(
    () =>
      subscribePayload(tool.id, (payload) => {
        if (payload.text?.trim()) setPendingExcerpt(payload)
      }),
    [tool.id],
  )

  useEffect(() => {
    void loadReadingList().then((list) => {
      setItems(list)
      setLoaded(true)
    })
  }, [])

  const persist = useCallback(async (next: ReadingItem[]) => {
    setItems(next)
    await saveReadingList(next)
  }, [])

  const counts = useMemo(() => readingCounts(items), [items])
  const tags = useMemo(() => readingTags(items), [items])
  const progress = useMemo(() => readingProgress(items), [items])
  const visible = useMemo(
    () => sortReadingList(filterReadingList(items, query, filter, tag), sort),
    [items, query, filter, tag, sort],
  )
  const filtersActive = query.trim().length > 0 || filter !== 'all' || tag !== 'all'

  const resetFilters = () => {
    setQuery('')
    setFilter('all')
    setTag('all')
  }

  const savePage = async () => {
    const trimmedUrl = customUrl.trim()
    const source = trimmedUrl
      ? /^https?:\/\//i.test(trimmedUrl)
        ? { url: trimmedUrl, title: customTitle.trim() || trimmedUrl }
        : null
      : await readActiveTab()
    if (!source) {
      showToast(t('readingList.noTab'), { variant: 'error' })
      return
    }
    const item = newReadingItem({ ...source, note, tags: parseReadingTags(tagsText) })
    await persist([item, ...items])
    setNote('')
    setTagsText('')
    setCustomUrl('')
    setCustomTitle('')
    showToast(t('readingList.saved'))
  }

  const saveExcerpt = async (excerpt: string) => {
    const pageUrl = pendingExcerpt?.pageUrl
    const source =
      pageUrl && /^https?:\/\//i.test(pageUrl)
        ? { url: pageUrl, title: pendingExcerpt?.pageTitle || pageUrl }
        : await readActiveTab()
    if (!source) {
      showToast(t('readingList.noTab'), { variant: 'error' })
      return
    }
    await persist([newReadingItem({ ...source, excerpt }), ...items])
    setPendingExcerpt(null)
    showToast(t('readingList.saved'))
  }

  const patchItem = (id: string, change: Partial<ReadingItem>) =>
    persist(items.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const toggleRead = (id: string) => {
    const target = items.find((item) => item.id === id)
    if (target)
      void patchItem(id, { read: !target.read, readAt: target.read ? undefined : Date.now() })
  }

  const toggleStar = (id: string) => {
    const target = items.find((item) => item.id === id)
    if (target) void patchItem(id, { starred: !target.starred })
  }

  const remove = (item: ReadingItem) => {
    const before = items
    void persist(items.filter((entry) => entry.id !== item.id))
    showToast(t('readingList.removed'), { undo: () => void persist(before) })
  }

  const markAllRead = () => {
    const before = items
    const shownIds = new Set(visible.map((item) => item.id))
    void persist(
      items.map((item) =>
        shownIds.has(item.id) ? { ...item, read: true, readAt: Date.now() } : item,
      ),
    )
    showToast(t('readingList.markedAllRead'), { undo: () => void persist(before) })
  }

  const clearRead = () => {
    const before = items
    void persist(items.filter((item) => !item.read))
    showToast(t('readingList.clearedRead', { count: counts.read }), {
      undo: () => void persist(before),
    })
  }

  const saveEdit = (id: string, changes: Pick<ReadingItem, 'title' | 'url' | 'note' | 'tags'>) => {
    void patchItem(id, changes)
    setEditing(null)
    showToast(t('readingList.updated'))
  }

  const copyText = (text: string, messageKey: string) =>
    void navigator.clipboard.writeText(text).then(
      () => showToast(t(messageKey)),
      () => showToast(t('readingList.copyFailed'), { variant: 'error' }),
    )

  const stamp = () => new Date().toISOString().slice(0, 10)
  const download = (text: string, mime: string, ext: string) =>
    downloadBlob(new Blob([text], { type: mime }), `reading-list-${stamp()}.${ext}`)

  const importJson = async (file: File) => {
    try {
      const merged = mergeImportedReading(items, JSON.parse(await file.text()))
      await persist(merged)
      showToast(t('readingList.imported', { count: merged.length - items.length }))
    } catch {
      showToast(t('readingList.importFailed'), { variant: 'error' })
    }
  }

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <ToolSearchLayout
        header={
          <>
            {pendingExcerpt?.text && (
              <PendingExcerpt
                key={pendingExcerpt.createdAt}
                excerpt={pendingExcerpt.text}
                sourceUrl={pendingExcerpt.pageUrl}
                sourceTitle={pendingExcerpt.pageTitle}
                onSave={(excerpt) => void saveExcerpt(excerpt)}
                onDismiss={() => setPendingExcerpt(null)}
              />
            )}
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('readingList.search')}
                ariaLabel={t('readingList.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <Button size="sm" className="shrink-0" onClick={() => void savePage()}>
                <BookmarkPlusIcon />
                {t('readingList.savePage')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="shrink-0"
                    aria-label={t('readingList.export')}
                    title={t('readingList.export')}
                  >
                    <FilesIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!visible.length}
                    onSelect={() => download(exportReadingMarkdown(visible), 'text/markdown', 'md')}
                  >
                    <FileDownIcon className="size-4" />
                    {t('readingList.export')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!visible.length}
                    onSelect={() =>
                      download(JSON.stringify(visible, null, 2), 'application/json', 'json')
                    }
                  >
                    <FileJsonIcon className="size-4" />
                    {t('readingList.exportJson')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!visible.length}
                    onSelect={() => download(exportReadingCsv(visible), 'text/csv', 'csv')}
                  >
                    <FileSpreadsheetIcon className="size-4" />
                    {t('readingList.exportCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => importRef.current?.click()}>
                    <UploadIcon className="size-4" />
                    {t('readingList.importJson')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!visible.some((item) => !item.read)}
                    onSelect={markAllRead}
                  >
                    <CheckCheckIcon className="size-4" />
                    {t('readingList.markAllRead')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!counts.read}
                    className="text-destructive focus:text-destructive"
                    onSelect={clearRead}
                  >
                    <Trash2Icon className="size-4" />
                    {t('readingList.clearRead', { count: counts.read })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void importJson(file)
                }}
              />
            </div>

            <div className="rounded-lg border bg-muted/20">
              <button
                type="button"
                aria-expanded={detailsOpen}
                onClick={() => setDetailsOpen((open) => !open)}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDownIcon
                  className={cn(
                    'size-3.5 transition-transform duration-200',
                    detailsOpen && 'rotate-180',
                  )}
                />
                {detailsOpen ? t('readingList.closeCapture') : t('readingList.addCustom')}
              </button>
              <AnimatePresence initial={false}>
                {detailsOpen && (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-1.5 px-2.5 pb-2.5">
                      <div className="grid grid-cols-1 gap-1.5 @[460px]:grid-cols-2">
                        <Input
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder={t('readingList.customUrlPlaceholder')}
                          aria-label={t('readingList.customUrlPlaceholder')}
                          className="h-8 text-xs"
                        />
                        <Input
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder={t('readingList.customTitlePlaceholder')}
                          aria-label={t('readingList.customTitlePlaceholder')}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t('readingList.notePlaceholder')}
                        aria-label={t('readingList.notePlaceholder')}
                        className="min-h-14 resize-none text-xs"
                      />
                      <Input
                        value={tagsText}
                        onChange={(e) => setTagsText(e.target.value)}
                        placeholder={t('readingList.tagsPlaceholder')}
                        aria-label={t('readingList.tagsPlaceholder')}
                        className="h-8 text-xs"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <Segmented
                size="sm"
                ariaLabel={t('readingList.filterLabel')}
                value={filter}
                onValueChange={(v) => setFilter(v as ReadingFilter)}
                options={[
                  { value: 'all', label: t('readingList.filter.all', { count: counts.all }) },
                  {
                    value: 'unread',
                    label: t('readingList.filter.unread', { count: counts.unread }),
                  },
                  {
                    value: 'starred',
                    label: t('readingList.filter.starred', { count: counts.starred }),
                  },
                  { value: 'read', label: t('readingList.filter.read', { count: counts.read }) },
                ]}
              />
              <Segmented
                size="sm"
                ariaLabel={t('readingList.sortLabel')}
                value={sort}
                onValueChange={(v) => setSort(v as ReadingSort)}
                options={[
                  { value: 'newest', label: t('readingList.sort.newest') },
                  { value: 'oldest', label: t('readingList.sort.oldest') },
                  { value: 'title', label: t('readingList.sort.title') },
                  { value: 'domain', label: t('readingList.sort.domain') },
                ]}
              />
            </div>

            {tags.length > 0 && (
              <ChipRail role="tablist" label={t('readingList.allTags')} edgeFade={false}>
                <TagChip
                  active={tag === 'all'}
                  label={t('readingList.allTags')}
                  count={items.length}
                  onClick={() => setTag('all')}
                />
                {tags.map(({ tag: name, count }) => (
                  <TagChip
                    key={name}
                    active={tag === name}
                    label={`#${name}`}
                    count={count}
                    onClick={() => setTag(tag === name ? 'all' : name)}
                  />
                ))}
              </ChipRail>
            )}
          </>
        }
        bodyClassName="py-3"
        footer={
          <ProductivityStatusBar
            trailing={
              filtersActive ? (
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-6 px-2 text-primary"
                  onClick={resetFilters}
                >
                  {t('readingList.clearFilters')}
                </Button>
              ) : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate">
                {t('readingList.summary', {
                  total: items.length,
                  unread: counts.unread,
                  shown: visible.length,
                })}
              </span>
              {progress.total > 0 && (
                <span
                  role="progressbar"
                  aria-label={t('readingList.progress', progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.pct}
                  title={t('readingList.progress', progress)}
                  className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted @[380px]:block"
                >
                  <motion.span
                    className="block h-full origin-left rounded-full bg-emerald-500"
                    initial={false}
                    animate={{ scaleX: progress.pct / 100 }}
                    transition={{ duration: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              )}
            </div>
          </ProductivityStatusBar>
        }
      >
        {!loaded ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <LibraryIcon className="size-6 text-primary" aria-hidden />
            </span>
            <p className="text-sm font-semibold">
              {filtersActive ? t('readingList.noMatchTitle') : t('readingList.emptyTitle')}
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              {filtersActive ? t('readingList.noMatchHint') : t('readingList.emptyHint')}
            </p>
            {filtersActive ? (
              <Button size="sm" variant="outline" className="mt-1" onClick={resetFilters}>
                {t('readingList.clearFilters')}
              </Button>
            ) : (
              <Button size="sm" className="mt-1" onClick={() => void savePage()}>
                <BookmarkPlusIcon />
                {t('readingList.savePage')}
              </Button>
            )}
          </div>
        ) : (
          <StaggerChildren className="grid grid-cols-1 gap-2 @[760px]:grid-cols-2" stagger={0.04}>
            {visible.map((item) => (
              <StaggerItem key={item.id} className="flex [&>*]:w-full">
                <ReadingItemCard
                  item={item}
                  onToggleRead={toggleRead}
                  onToggleStar={toggleStar}
                  onOpen={(entry) => void chrome.tabs.create({ url: entry.url })}
                  onCopyLink={(entry) => copyText(entry.url, 'readingList.copiedLink')}
                  onCopyMarkdown={(entry) =>
                    copyText(exportReadingMarkdown([entry]), 'readingList.copiedMd')
                  }
                  onEdit={setEditing}
                  onDelete={remove}
                  onTagClick={setTag}
                />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>

      <ReadingEditDialog item={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
    </ToolPage>
  )
}

function TagChip({
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
        'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium',
        'transition-[color,background-color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      <span className="max-w-[9rem] truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 text-[9.5px] leading-4 tabular-nums',
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}
