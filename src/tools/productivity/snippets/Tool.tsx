import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CopyIcon,
  DownloadIcon,
  FilesIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { ToolPage } from '@/shared/components/ToolPage'
import { ToolSearchLayout } from '@/shared/components/ToolSearchLayout'
import { SearchInput } from '@/shared/components/SearchInput'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Segmented } from '@/shared/components/ui/segmented'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion'
import { downloadBlob } from '@/features/netmon/download'
import { cn } from '@/shared/utils/cn'

import { useProductivityTool } from '../_shared'
import { ProductivityStatusBar } from '../_shared/ProductivityStatusBar'
import {
  DEFAULT_SNIPPET_CATEGORIES,
  duplicateSnippet,
  filterSnippets,
  loadSnippets,
  mergeImportedSnippets,
  newSnippet,
  saveSnippets,
  snippetCategories,
  snippetStats,
  sortSnippets,
  type Snippet,
  type SnippetSort,
} from './model'

export default function SnippetsTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.snippets')
  const reduce = useReducedMotion()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | 'all'>('all')
  const [sort, setSort] = useState<SnippetSort>('recent')
  const [loaded, setLoaded] = useState(false)
  const [editor, setEditor] = useState<Snippet | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadSnippets().then((list) => {
      setSnippets(list)
      setLoaded(true)
    })
  }, [])

  const persist = useCallback(async (next: Snippet[]) => {
    setSnippets(next)
    await saveSnippets(next)
  }, [])

  const categories = useMemo(() => snippetCategories(snippets), [snippets])
  const visible = useMemo(
    () => sortSnippets(filterSnippets(snippets, query, category), sort),
    [snippets, query, category, sort],
  )

  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 2800)
  }

  const copyBody = (snippet: Snippet) => {
    void navigator.clipboard.writeText(snippet.body).then(() => notify(t('snippets.copied')))
  }

  const togglePin = (id: string) => {
    void persist(
      snippets.map((s) => (s.id === id ? { ...s, pinned: !s.pinned, updatedAt: Date.now() } : s)),
    )
  }

  const remove = (id: string) => {
    void persist(snippets.filter((s) => s.id !== id))
    notify(t('snippets.deleted'))
  }

  const saveEditor = () => {
    if (!editor) return
    const trimmed = { ...editor, title: editor.title.trim() || t('snippets.untitled'), updatedAt: Date.now() }
    const exists = snippets.some((s) => s.id === trimmed.id)
    void persist(exists ? snippets.map((s) => (s.id === trimmed.id ? trimmed : s)) : [trimmed, ...snippets])
    setEditor(null)
    notify(t('snippets.saved'))
  }

  const exportAll = () => {
    downloadBlob(
      new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' }),
      `snippets-${new Date().toISOString().slice(0, 10)}.json`,
    )
    notify(t('snippets.exported'))
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Snippet[] | Snippet
      const rows = Array.isArray(parsed) ? parsed : [parsed]
      await persist(mergeImportedSnippets(snippets, rows))
      notify(t('snippets.imported', { count: rows.length }))
    } catch {
      notify(t('snippets.importFailed'))
    }
  }

  const filtersActive = query.trim().length > 0 || category !== 'all'

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
              <Button
                size="icon-sm"
                variant="secondary"
                aria-label={t('snippets.add')}
                title={t('snippets.add')}
                onClick={() => setEditor(newSnippet())}
              >
                <PlusIcon />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t('snippets.import')}
                title={t('snippets.import')}
                onClick={() => importRef.current?.click()}
              >
                <FilesIcon />
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void importJson(file)
                }}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t('snippets.export')}
                title={t('snippets.export')}
                onClick={exportAll}
                disabled={!snippets.length}
              >
                <DownloadIcon />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                ariaLabel={t('snippets.sortBy')}
                value={sort}
                onValueChange={(v) => setSort(v as SnippetSort)}
                options={[
                  { value: 'recent', label: t('snippets.sort.recent') },
                  { value: 'title', label: t('snippets.sort.title') },
                  { value: 'category', label: t('snippets.sort.category') },
                ]}
              />
              {filtersActive && (
                <Button
                  size="xs"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                  }}
                >
                  {t('snippets.clearFilters')}
                </Button>
              )}
            </div>
            <div role="tablist" aria-label={t('snippets.categories')} className="flex flex-wrap gap-1">
              {['all', ...categories].map((cat) => {
                const active = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'inline-flex h-7 cursor-pointer items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                    )}
                  >
                    {cat === 'all' ? t('snippets.allCategories') : cat}
                  </button>
                )
              })}
            </div>
          </>
        }
        bodyClassName="py-3"
        footer={
          toast ? (
            <ProductivityStatusBar>
              <p role="status" className="text-center text-xs text-foreground">
                {toast}
              </p>
            </ProductivityStatusBar>
          ) : loaded ? (
            <ProductivityStatusBar>{t('snippets.summary', { count: snippets.length, visible: visible.length })}</ProductivityStatusBar>
          ) : null
        }
      >
        {!loaded ? (
          <ul className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-20 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-12 text-center">
            <SparklesIcon className="size-8 text-primary/60" aria-hidden />
            <p className="text-sm font-medium">{t('snippets.emptyTitle')}</p>
            <p className="max-w-xs text-xs text-muted-foreground">{t('snippets.emptyHint')}</p>
            <Button size="sm" className="mt-1" onClick={() => setEditor(newSnippet())}>
              <PlusIcon />
              {t('snippets.addFirst')}
            </Button>
          </div>
        ) : (
          <StaggerChildren className="space-y-2" stagger={0.05}>
            {visible.map((snippet) => (
              <StaggerItem key={snippet.id}>
                <motion.article
                  layout={!reduce}
                  className={cn(
                    'group rounded-xl border bg-card p-3 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-sm',
                    snippet.pinned && 'border-primary/25 bg-primary/[0.03]',
                  )}
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {snippet.pinned && <PinIcon className="size-3.5 shrink-0 text-primary" aria-hidden />}
                        <h3 className="truncate text-sm font-semibold">{snippet.title}</h3>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <TagIcon className="size-3" aria-hidden />
                        {snippet.category}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Button size="icon-xs" variant="ghost" aria-label={t('snippets.duplicate')} onClick={() => void persist([duplicateSnippet(snippet), ...snippets])}>
                        <CopyIcon className="size-3.5 opacity-70" />
                      </Button>
                      <Button size="icon-xs" variant="ghost" aria-label={t('snippets.copy')} onClick={() => copyBody(snippet)}>
                        <CopyIcon />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={snippet.pinned ? t('snippets.unpin') : t('snippets.pin')}
                        onClick={() => togglePin(snippet.id)}
                      >
                        {snippet.pinned ? <PinOffIcon /> : <PinIcon />}
                      </Button>
                      <Button size="icon-xs" variant="ghost" aria-label={t('snippets.edit')} onClick={() => setEditor({ ...snippet })}>
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button size="icon-xs" variant="ghost" aria-label={t('snippets.delete')} onClick={() => remove(snippet.id)}>
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                  <pre className="scrollbar-styled max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-2 font-mono text-[11px] leading-relaxed text-foreground/90">
                    {snippet.body || t('snippets.noBody')}
                  </pre>
                  {snippet.body && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                      {t('snippets.stats', snippetStats(snippet.body))}
                    </p>
                  )}
                </motion.article>
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </ToolSearchLayout>

      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[min(90vh,32rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor && snippets.some((s) => s.id === editor.id) ? t('snippets.editTitle') : t('snippets.newTitle')}</DialogTitle>
          </DialogHeader>
          {editor && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="snippet-title">{t('snippets.fieldTitle')}</Label>
                <Input
                  id="snippet-title"
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="snippet-category">{t('snippets.fieldCategory')}</Label>
                <Input
                  id="snippet-category"
                  list="snippet-category-suggestions"
                  value={editor.category}
                  onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                />
                <datalist id="snippet-category-suggestions">
                  {DEFAULT_SNIPPET_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="snippet-body">{t('snippets.fieldBody')}</Label>
                <Textarea
                  id="snippet-body"
                  value={editor.body}
                  onChange={(e) => setEditor({ ...editor, body: e.target.value })}
                  className="min-h-40 font-mono text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditor(null)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={saveEditor} disabled={!editor?.body.trim()}>
              {t('snippets.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolPage>
  )
}
