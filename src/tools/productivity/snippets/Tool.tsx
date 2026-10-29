import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DownloadIcon,
  FileDownIcon,
  FilesIcon,
  PlusIcon,
  SparklesIcon,
  UploadIcon,
} from 'lucide-react'

import { downloadBlob } from '@/features/netmon/download'
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
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import './i18n'
import { SnippetCard } from './SnippetCard'
import { SnippetEditorDialog, VariableFillDialog } from './SnippetDialogs'
import {
  categorySnippetCount,
  createStarterSnippets,
  duplicateSnippet,
  exportSnippetsMarkdown,
  filterSnippets,
  loadSnippets,
  mergeImportedSnippets,
  newSnippet,
  parseSnippetTags,
  recordSnippetUse,
  resolveSnippetBody,
  saveSnippets,
  snippetCategories,
  snippetTags,
  sortSnippets,
  type Snippet,
  type SnippetResolveContext,
  type SnippetSort,
} from './model'

const COPIED_FLASH_MS = 1400

async function readPageContext(): Promise<SnippetResolveContext> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return { url: tab?.url, title: tab?.title }
  } catch {
    return {}
  }
}

export default function SnippetsTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.snippets')
  const { show: showToast } = useToast()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [tag, setTag] = useState<string | 'all'>('all')
  const [sort, setSort] = useState<SnippetSort>('recent')
  const [loaded, setLoaded] = useState(false)
  const [editor, setEditor] = useState<Snippet | null>(null)
  const [fillTarget, setFillTarget] = useState<Snippet | null>(null)
  const [pageContext, setPageContext] = useState<SnippetResolveContext>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    void loadSnippets().then((list) => {
      setSnippets(list)
      setLoaded(true)
    })
    void readPageContext().then(setPageContext)
    return () => clearTimeout(copiedTimer.current)
  }, [])

  const persist = useCallback(async (next: Snippet[]) => {
    setSnippets(next)
    await saveSnippets(next)
  }, [])

  const categories = useMemo(() => snippetCategories(snippets), [snippets])
  const tags = useMemo(() => snippetTags(snippets), [snippets])
  const visible = useMemo(
    () => sortSnippets(filterSnippets(snippets, query, category, tag), sort),
    [snippets, query, category, tag, sort],
  )
  const pinnedCount = useMemo(() => snippets.filter((s) => s.pinned).length, [snippets])
  const filtersActive = query.trim().length > 0 || category !== 'all' || tag !== 'all'

  const resetFilters = () => {
    setQuery('')
    setCategory('all')
    setTag('all')
  }

  const flashCopied = (id: string) => {
    clearTimeout(copiedTimer.current)
    setCopiedId(id)
    copiedTimer.current = setTimeout(() => setCopiedId(null), COPIED_FLASH_MS)
  }

  const writeClipboard = async (text: string, snippet: Snippet, messageKey: string) => {
    try {
      await navigator.clipboard.writeText(text)
      flashCopied(snippet.id)
      showToast(t(messageKey))
      void persist(recordSnippetUse(snippets, snippet.id))
    } catch {
      showToast(t('snippets.copyFailed'), { variant: 'error' })
    }
  }

  const copySnippet = (snippet: Snippet) =>
    void writeClipboard(resolveSnippetBody(snippet.body, {}, pageContext), snippet, 'snippets.copied')

  const copyResolved = (resolved: string, snippet: Snippet) => {
    setFillTarget(null)
    void writeClipboard(resolved, snippet, 'snippets.copiedResolved')
  }

  const copyRaw = (snippet: Snippet) => {
    setFillTarget(null)
    void writeClipboard(snippet.body, snippet, 'snippets.copied')
  }

  const togglePin = (id: string) => {
    void persist(snippets.map((s) => (s.id === id ? { ...s, pinned: !s.pinned, updatedAt: Date.now() } : s)))
  }

  const duplicate = (snippet: Snippet) => {
    void persist([duplicateSnippet(snippet), ...snippets])
    showToast(t('snippets.duplicated'))
  }

  const remove = (snippet: Snippet) => {
    const previous = snippets
    void persist(snippets.filter((s) => s.id !== snippet.id))
    showToast(t('snippets.deleted'), { undo: () => void persist(previous) })
  }

  const saveEditor = (tagsInput: string) => {
    if (!editor) return
    const trimmed: Snippet = {
      ...editor,
      title: editor.title.trim() || t('snippets.untitled'),
      shortcut: editor.shortcut?.trim() || undefined,
      tags: parseSnippetTags(tagsInput),
      updatedAt: Date.now(),
    }
    const exists = snippets.some((s) => s.id === trimmed.id)
    void persist(exists ? snippets.map((s) => (s.id === trimmed.id ? trimmed : s)) : [trimmed, ...snippets])
    setEditor(null)
    showToast(t('snippets.saved'))
  }

  const addStarters = () => {
    const starters = createStarterSnippets()
    void persist([...starters, ...snippets])
    showToast(t('snippets.starterAdded', { count: starters.length }))
  }

  const exportJson = () => {
    downloadBlob(
      new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' }),
      `snippets-${new Date().toISOString().slice(0, 10)}.json`,
    )
    showToast(t('snippets.exported'))
  }

  const exportMarkdown = () => {
    downloadBlob(
      new Blob([exportSnippetsMarkdown(snippets)], { type: 'text/markdown' }),
      `snippets-${new Date().toISOString().slice(0, 10)}.md`,
    )
    showToast(t('snippets.exported'))
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Snippet[] | Snippet
      const rows = Array.isArray(parsed) ? parsed : [parsed]
      await persist(mergeImportedSnippets(snippets, rows))
      showToast(t('snippets.imported', { count: rows.length }))
    } catch {
      showToast(t('snippets.importFailed'), { variant: 'error' })
    }
  }

  return (
    <ToolPage tool={tool} contentClassName="overflow-hidden p-0">
      <ToolSearchLayout
        header={
          <>
            <div className="flex items-center gap-1.5">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder={t('snippets.search')}
                ariaLabel={t('snippets.search')}
                shortcut="/"
                className="min-w-0 flex-1"
              />
              <Button size="sm" className="shrink-0" onClick={() => setEditor(newSnippet())}>
                <PlusIcon />
                <span className="hidden @[380px]:inline">{t('snippets.add')}</span>
                <span className="sr-only @[380px]:hidden">{t('snippets.add')}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="shrink-0"
                    aria-label={t('snippets.export')}
                    title={t('snippets.export')}
                  >
                    <FilesIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => importRef.current?.click()}>
                    <UploadIcon className="size-4" />
                    {t('snippets.import')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!snippets.length} onSelect={exportJson}>
                    <DownloadIcon className="size-4" />
                    {t('snippets.export')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!snippets.length} onSelect={exportMarkdown}>
                    <FileDownIcon className="size-4" />
                    {t('snippets.exportMd')}
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

            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
              <Segmented
                size="sm"
                ariaLabel={t('snippets.sortBy')}
                value={sort}
                onValueChange={(v) => setSort(v as SnippetSort)}
                options={[
                  { value: 'recent', label: t('snippets.sort.recent') },
                  { value: 'popular', label: t('snippets.sort.popular') },
                  { value: 'title', label: t('snippets.sort.title') },
                  { value: 'category', label: t('snippets.sort.category') },
                ]}
              />
              {filtersActive && (
                <Button size="xs" variant="ghost" className="shrink-0 text-primary" onClick={resetFilters}>
                  {t('snippets.clearFilters')}
                </Button>
              )}
            </div>

            <ChipRail role="tablist" label={t('snippets.categories')} edgeFade={false}>
              {['all', ...categories].map((cat) => (
                <FilterChip
                  key={cat}
                  active={category === cat}
                  label={cat === 'all' ? t('snippets.allCategories') : cat}
                  count={categorySnippetCount(snippets, cat)}
                  onClick={() => setCategory(cat)}
                />
              ))}
            </ChipRail>

            {tags.length > 0 && (
              <ChipRail label={t('snippets.tags')} edgeFade={false}>
                {tags.map(({ tag: name, count }) => (
                  <FilterChip
                    key={name}
                    active={tag === name}
                    label={`#${name}`}
                    count={count}
                    subtle
                    onClick={() => setTag(tag === name ? 'all' : name)}
                  />
                ))}
              </ChipRail>
            )}
          </>
        }
        bodyClassName="py-3"
        footer={
          loaded ? (
            <ProductivityStatusBar
              trailing={
                pinnedCount > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {t('snippets.pinnedCount', { count: pinnedCount })}
                  </span>
                ) : undefined
              }
            >
              {t('snippets.summary', { count: snippets.length, visible: visible.length })}
            </ProductivityStatusBar>
          ) : null
        }
      >
        {!loaded ? (
          <ul className="grid grid-cols-1 gap-2 @[720px]:grid-cols-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-32 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <SparklesIcon className="size-6 text-primary" aria-hidden />
            </span>
            <p className="text-sm font-semibold">
              {filtersActive ? t('snippets.noMatchTitle') : t('snippets.emptyTitle')}
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              {filtersActive ? t('snippets.noMatchHint') : t('snippets.emptyHint')}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              {filtersActive ? (
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  {t('snippets.clearFilters')}
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={() => setEditor(newSnippet())}>
                    <PlusIcon />
                    {t('snippets.addFirst')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={addStarters}>
                    <SparklesIcon />
                    {t('snippets.loadStarters')}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <StaggerChildren className="grid grid-cols-1 gap-2 @[720px]:grid-cols-2" stagger={0.04}>
            {visible.map((snippet) => (
              <StaggerItem key={snippet.id} className="flex [&>*]:w-full">
                <SnippetCard
                  snippet={snippet}
                  copied={copiedId === snippet.id}
                  onCopy={copySnippet}
                  onFillAndCopy={setFillTarget}
                  onTogglePin={togglePin}
                  onDuplicate={duplicate}
                  onEdit={(s) => setEditor({ ...s })}
                  onDelete={remove}
                  onTagClick={(name) => setTag(name)}
                />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>

      <SnippetEditorDialog
        editor={editor}
        isEditing={Boolean(editor && snippets.some((s) => s.id === editor.id))}
        onChange={setEditor}
        onSave={saveEditor}
      />
      <VariableFillDialog
        snippet={fillTarget}
        context={pageContext}
        onClose={() => setFillTarget(null)}
        onCopyResolved={copyResolved}
        onCopyRaw={copyRaw}
      />
    </ToolPage>
  )
}

function FilterChip({
  active,
  label,
  count,
  subtle,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  subtle?: boolean
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
          : cn('text-muted-foreground hover:border-foreground/20 hover:text-foreground', subtle ? 'border-transparent bg-muted/60' : 'border-border'),
      )}
    >
      <span className="max-w-[9rem] truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 text-[9.5px] leading-4 tabular-nums',
          active ? 'bg-primary/15 text-primary' : 'bg-background/80 text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}
