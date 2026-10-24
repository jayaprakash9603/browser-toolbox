import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, EyeOffIcon, LoaderCircleIcon, SearchIcon, ShieldAlertIcon, Trash2Icon, Undo2Icon, XIcon } from 'lucide-react'

import { assemblePdf, updatePdfMetadata, type PageSpec } from '@/core/engines/pdf/edit'
import type { PageText } from '@/core/engines/pdf/pdfjs'
import { findText } from '@/core/engines/pdf/textLayout'
import { PdfPageImage } from '@/shared/components/pdf'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'
import { clamp } from './placed'
import { rasterizePage, readAllPages } from './rasterize'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

interface Mark {
  id: string
  page: number
  u: number
  v: number
  w: number
  h: number
  /** The search that produced it, for grouping; drawn marks have none. */
  query?: string
}

const PATTERNS = {
  email: '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+',
  phone: '(?:\\+?\\d{1,3}[\\s.-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s.-]?\\d{3,4}[\\s.-]?\\d{3,4}',
  card: '\\b(?:\\d[ -]?){13,19}\\b',
  date: '\\b\\d{1,4}[./-]\\d{1,2}[./-]\\d{1,4}\\b',
} as const

type Pattern = keyof typeof PATTERNS

function MarkCanvas({ doc, page, marks, onAdd, onRemove }: { doc: ReturnType<typeof useOpenPdf>; page: number; marks: Mark[]; onAdd: (mark: Omit<Mark, 'id'>) => void; onRemove: (id: string) => void }) {
  const { t } = useTranslation()
  const frame = useRef<HTMLDivElement>(null)
  const start = useRef<{ u: number; v: number } | null>(null)
  const [draft, setDraft] = useState<{ u: number; v: number; w: number; h: number } | null>(null)
  const info = doc.pages[page]
  const point = (event: PointerEvent) => {
    const box = frame.current!.getBoundingClientRect()
    return { u: clamp((event.clientX - box.left) / box.width, 0, 1), v: clamp((event.clientY - box.top) / box.height, 0, 1) }
  }
  return (
    <div
      ref={frame}
      className="relative w-full cursor-crosshair touch-none select-none"
      style={{ maxWidth: Math.max(info.width * 1.3, 320) }}
      onPointerDown={(event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
        start.current = point(event)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        const at = point(event)
        setDraft({ u: Math.min(start.current.u, at.u), v: Math.min(start.current.v, at.v), w: Math.abs(at.u - start.current.u), h: Math.abs(at.v - start.current.v) })
      }}
      onPointerUp={() => {
        if (draft && draft.w * info.width > 3 && draft.h * info.height > 3) onAdd({ page, ...draft })
        start.current = null
        setDraft(null)
      }}
    >
      <PdfPageImage doc={doc.handle} pageNumber={page + 1} width={info.width} height={info.height} eager alt={t('fileui.page', { index: page + 1, total: doc.pages.length })} />
      {marks
        .filter((mark) => mark.page === page)
        .map((mark) => (
          <span
            key={mark.id}
            className="group absolute bg-neutral-950/85 ring-1 ring-red-500/70"
            style={{ left: `${mark.u * 100}%`, top: `${mark.v * 100}%`, width: `${mark.w * 100}%`, height: `${mark.h * 100}%` }}
          >
            <button
              type="button"
              onClick={() => onRemove(mark.id)}
              aria-label={t('pdf.redact.removeMark')}
              className="absolute -top-2 -right-2 hidden size-4 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow group-hover:flex focus-visible:flex"
            >
              <XIcon className="size-2.5" />
            </button>
          </span>
        ))}
      {draft && (
        <span
          className="pointer-events-none absolute border-2 border-dashed border-red-500 bg-neutral-950/50"
          style={{ left: `${draft.u * 100}%`, top: `${draft.v * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  )
}

/** Permanently blacks out text and images: marked pages are rebuilt as pictures, so nothing remains underneath. */
export function RedactPanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [page, setPage] = useState(0)
  const [marks, setMarks] = useState<Mark[]>([])
  const [history, setHistory] = useState<Mark[][]>([])
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [searching, setSearching] = useState(false)
  const [lastSearch, setLastSearch] = useState<{ label: string; count: number } | null>(null)
  const [stripMetadata, setStripMetadata] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const pagesText = useRef<PageText[] | null>(null)
  const { busy, error, run } = useTask()

  const commit = (next: Mark[]) => {
    setHistory((current) => [...current.slice(-30), marks])
    setMarks(next)
  }

  const search = async (needle: string, label: string, regex: boolean) => {
    if (!needle.trim()) return
    setSearching(true)
    try {
      pagesText.current ??= await readAllPages(doc.handle)
      const found: Mark[] = []
      pagesText.current.forEach((text, index) => {
        for (const rect of findText(text, needle, { caseSensitive, wholeWord: regex ? false : wholeWord, regex })) {
          const pad = rect.h * 0.12
          found.push({ id: crypto.randomUUID(), page: index, u: (rect.x - pad) / text.width, v: (rect.y - pad) / text.height, w: (rect.w + pad * 2) / text.width, h: (rect.h + pad * 2) / text.height, query: label })
        }
      })
      setLastSearch({ label, count: found.length })
      if (found.length) {
        commit([...marks, ...found])
        setPage(found[0].page)
      }
    } finally {
      setSearching(false)
    }
  }

  const apply = () =>
    run(async () => {
      const marked = new Set(marks.map((mark) => mark.page))
      const specs: PageSpec[] = []
      setProgress(0)
      for (const [index, info] of doc.pages.entries()) {
        if (!marked.has(index)) {
          specs.push({ kind: 'page', source: 0, index })
          continue
        }
        specs.push(
          await rasterizePage(doc.handle, index, info, {
            dpi: 200,
            quality: 0.92,
            paint: (context, canvas) => {
              context.fillStyle = '#000000'
              for (const mark of marks) {
                if (mark.page !== index) continue
                context.fillRect(Math.floor(mark.u * canvas.width), Math.floor(mark.v * canvas.height), Math.ceil(mark.w * canvas.width) + 1, Math.ceil(mark.h * canvas.height) + 1)
              }
            },
          }),
        )
        setProgress((index + 1) / total)
      }
      let bytes = await assemblePdf([sourceOf(doc)], specs, stripMetadata ? {} : { metadataFrom: 0 })
      if (stripMetadata) bytes = await updatePdfMetadata({ bytes }, { title: '', author: '', subject: '', keywords: '' }, true)
      showResults({
        artifacts: [pdfArtifact(`${stemOf(doc)}-redacted.pdf`, bytes, { source: { name: doc.name, size: doc.bytes.length }, note: t('pdf.redact.note', { count: marks.length, pages: marked.size }) })],
      })
    }).finally(() => setProgress(null))

  const byQuery = [...new Set(marks.map((mark) => mark.query ?? ''))].map((label) => ({ label, count: marks.filter((mark) => (mark.query ?? '') === label).length }))
  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 @[860px]:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">{t('pdf.redact.hint')}</p>
          <div
            className="flex justify-center overflow-hidden rounded-2xl border bg-muted/40 p-4"
            style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          >
            <MarkCanvas
              doc={doc}
              page={page}
              marks={marks}
              onAdd={(mark) => commit([...marks, { ...mark, id: crypto.randomUUID() }])}
              onRemove={(id) => commit(marks.filter((mark) => mark.id !== id))}
            />
          </div>
          {total > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label={t('pdf.view.previousPage')}>
                <ChevronLeftIcon />
              </Button>
              <span className="text-[11px] tabular-nums text-muted-foreground">{t('fileui.page', { index: page + 1, total })}</span>
              <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.min(total - 1, value + 1))} disabled={page >= total - 1} aria-label={t('pdf.view.nextPage')}>
                <ChevronRightIcon />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 @[860px]:sticky @[860px]:top-2">
          <PanelSection title={t('pdf.redact.find')} icon={<SearchIcon />}>
            <form
              className="flex gap-1.5"
              onSubmit={(event) => {
                event.preventDefault()
                void search(query, query.trim(), false)
              }}
            >
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('pdf.redact.findPlaceholder')} aria-label={t('pdf.redact.find')} className="h-8" />
              <Button type="submit" size="sm" disabled={!query.trim() || searching}>
                {searching ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <SearchIcon aria-hidden />}
                {t('pdf.redact.mark')}
              </Button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              <Button variant={caseSensitive ? 'secondary' : 'outline'} size="xs" aria-pressed={caseSensitive} onClick={() => setCaseSensitive((value) => !value)}>
                Aa
              </Button>
              <Button variant={wholeWord ? 'secondary' : 'outline'} size="xs" aria-pressed={wholeWord} onClick={() => setWholeWord((value) => !value)}>
                {t('pdf.redact.wholeWord')}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">{t('pdf.redact.patterns')}</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PATTERNS) as Pattern[]).map((pattern) => (
                  <Button key={pattern} variant="outline" size="xs" disabled={searching} onClick={() => void search(PATTERNS[pattern], t(`pdf.redact.pattern.${pattern}`), true)}>
                    {t(`pdf.redact.pattern.${pattern}`)}
                  </Button>
                ))}
              </div>
            </div>
            {lastSearch && (
              <p className={cn('text-[11px]', lastSearch.count ? 'text-foreground' : 'text-muted-foreground')} role="status" aria-live="polite">
                {t('pdf.redact.found', { count: lastSearch.count, label: lastSearch.label })}
              </p>
            )}
          </PanelSection>

          <PanelSection
            title={t('pdf.redact.marks', { count: marks.length })}
            icon={<EyeOffIcon />}
            actions={
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon-xs" onClick={() => {
                  const previous = history.at(-1)
                  if (!previous) return
                  setHistory((current) => current.slice(0, -1))
                  setMarks(previous)
                }} disabled={!history.length} aria-label={t('pdf.sign.undo')}>
                  <Undo2Icon />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => commit([])} disabled={!marks.length} aria-label={t('pdf.redact.clear')}>
                  <Trash2Icon />
                </Button>
              </div>
            }
          >
            {byQuery.length ? (
              <ul className="flex flex-col gap-1">
                {byQuery.map(({ label, count }) => (
                  <li key={label || 'drawn'} className="flex items-center gap-2 rounded-lg border bg-background/60 px-2 py-1 text-xs">
                    <span className="size-2.5 shrink-0 rounded-sm bg-neutral-900 ring-1 ring-red-500/70" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{label || t('pdf.redact.drawn')}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => commit(marks.filter((mark) => (mark.query ?? '') !== label))} aria-label={t('pdf.redact.removeGroup', { label: label || t('pdf.redact.drawn') })}>
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">{t('pdf.redact.none')}</p>
            )}
            <OptionSwitch label={t('pdf.redact.metadata')} hint={t('pdf.redact.metadataHint')} checked={stripMetadata} onChange={setStripMetadata} />
          </PanelSection>
        </div>
      </div>
      {error && <PanelError message={error} />}
      <ActionBar progress={progress}>
        <Button variant="destructive" onClick={() => void apply()} disabled={busy || !marks.length} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <ShieldAlertIcon aria-hidden />}
          {t('pdf.redact.run', { count: marks.length })}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">{t('pdf.redact.warning')}</span>
      </ActionBar>
    </div>
  )
}
