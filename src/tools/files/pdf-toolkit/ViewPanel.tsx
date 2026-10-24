import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EraserIcon,
  InfoIcon,
  LoaderCircleIcon,
  MaximizeIcon,
  SaveIcon,
  SearchIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'

import { readPdfMetadata, updatePdfMetadata, type EditableMetadata, type PdfMetadata } from '@/core/engines/pdf/edit'
import { extractPageText } from '@/core/engines/pdf/pdfjs'
import { OptionField, PanelError, PanelSection } from '@/shared/components/toolkit'
import { PdfPageImage } from '@/shared/components/pdf'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const FIT_WIDTH = 860

interface Match {
  page: number
  count: number
  snippet: { before: string; hit: string; after: string }
}

function findMatches(texts: string[], query: string): Match[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const matches: Match[] = []
  texts.forEach((text, page) => {
    const flat = text.replace(/\s+/g, ' ')
    const lower = flat.toLocaleLowerCase()
    let at = lower.indexOf(needle)
    if (at < 0) return
    const first = at
    let count = 0
    while (at >= 0) {
      count += 1
      at = lower.indexOf(needle, at + needle.length)
    }
    matches.push({
      page,
      count,
      snippet: {
        before: (first > 48 ? '…' : '') + flat.slice(Math.max(0, first - 48), first),
        hit: flat.slice(first, first + needle.length),
        after: flat.slice(first + needle.length, first + needle.length + 64),
      },
    })
  })
  return matches
}

function formatDate(date: Date | null, locale: string): string {
  return date ? date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function paperName(width: number, height: number): string | null {
  const [short, long] = [Math.min(width, height), Math.max(width, height)]
  const near = (a: number, b: number) => Math.abs(a - b) < 3
  if (near(short, 595.28) && near(long, 841.89)) return 'A4'
  if (near(short, 612) && near(long, 792)) return 'Letter'
  if (near(short, 612) && near(long, 1008)) return 'Legal'
  if (near(short, 419.53) && near(long, 595.28)) return 'A5'
  if (near(short, 841.89) && near(long, 1190.55)) return 'A3'
  return null
}

function PropertiesSection({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [meta, setMeta] = useState<PdfMetadata | null>(null)
  const [draft, setDraft] = useState<EditableMetadata | null>(null)
  const { busy, error, setError, run } = useTask()

  useEffect(() => {
    let cancelled = false
    readPdfMetadata(sourceOf(doc)).then(
      (value) => {
        if (cancelled) return
        setMeta(value)
        setDraft({ title: value.title, author: value.author, subject: value.subject, keywords: value.keywords })
      },
      (cause: unknown) => !cancelled && setError(cause instanceof Error ? cause.message : String(cause)),
    )
    return () => {
      cancelled = true
    }
  }, [doc, setError])

  const first = doc.pages[0]
  const paper = first ? paperName(first.width, first.height) : null
  const mm = (points: number) => Math.round((points / 72) * 25.4)

  const save = (strip: boolean) =>
    run(async () => {
      if (!draft) return
      const bytes = await updatePdfMetadata(sourceOf(doc), draft, strip)
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}${strip ? '-clean' : ''}.pdf`, bytes, {
            source: { name: doc.name, size: doc.bytes.length },
            note: strip ? t('pdf.view.strippedNote') : undefined,
          }),
        ],
      })
    })

  const field = (key: keyof EditableMetadata) => (
    <OptionField label={t(`pdf.view.meta.${key}`)}>
      <Input
        value={draft?.[key] ?? ''}
        disabled={!draft}
        onChange={(event) => setDraft((current) => (current ? { ...current, [key]: event.target.value } : current))}
        className="h-8"
      />
    </OptionField>
  )

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <PanelSection
        title={t('pdf.view.properties')}
        icon={<InfoIcon />}
        actions={
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label={t('pdf.view.closeProperties')}>
            <XIcon />
          </Button>
        }
      >
        <div className="grid gap-2.5 @[560px]:grid-cols-2">
          {field('title')}
          {field('author')}
          {field('subject')}
          {field('keywords')}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl border bg-muted/30 px-3 py-2.5 text-[11px] @[560px]:grid-cols-4">
          {[
            [t('pdf.view.meta.pages'), String(doc.pages.length)],
            [t('pdf.view.meta.size'), first ? `${paper ? `${paper} · ` : ''}${mm(first.width)} × ${mm(first.height)} mm` : '—'],
            [t('pdf.view.meta.creator'), meta?.creator || '—'],
            [t('pdf.view.meta.producer'), meta?.producer || '—'],
            [t('pdf.view.meta.created'), formatDate(meta?.created ?? null, i18n.language)],
            [t('pdf.view.meta.modified'), formatDate(meta?.modified ?? null, i18n.language)],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate font-medium" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {error && <PanelError message={error} />}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void save(false)} disabled={!draft || busy}>
            {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <SaveIcon aria-hidden />}
            {t('pdf.view.saveProperties')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void save(true)} disabled={!draft || busy}>
            <EraserIcon aria-hidden />
            {t('pdf.view.stripProperties')}
          </Button>
        </div>
      </PanelSection>
    </motion.div>
  )
}

export function ViewPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const total = doc.pages.length
  const scroller = useRef<HTMLDivElement>(null)
  const figures = useRef<(HTMLElement | null)[]>([])
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])
  const [current, setCurrent] = useState(0)
  const [pageInput, setPageInput] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [showProperties, setShowProperties] = useState(false)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [texts, setTexts] = useState<string[] | null>(null)
  const [extracting, setExtracting] = useState<number | null>(null)
  const [activeMatch, setActiveMatch] = useState(0)

  useEffect(() => {
    const root = scroller.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const ratios = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(Number((entry.target as HTMLElement).dataset.page), entry.intersectionRatio)
        let best = -1
        let bestRatio = 0
        for (const [page, ratio] of ratios) {
          if (ratio > bestRatio || (ratio === bestRatio && page < best)) {
            best = page
            bestRatio = ratio
          }
        }
        if (best >= 0) setCurrent(best)
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    for (const figure of figures.current) if (figure) observer.observe(figure)
    return () => observer.disconnect()
  }, [total])

  useEffect(() => {
    thumbs.current[current]?.scrollIntoView?.({ block: 'nearest' })
  }, [current])

  const goTo = (page: number) => {
    const target = Math.max(0, Math.min(total - 1, page))
    const root = scroller.current
    const figure = figures.current[target]
    if (root && figure) root.scrollTo({ top: figure.offsetTop - 12, behavior: reduce ? 'auto' : 'smooth' })
    setCurrent(target)
  }

  const matches = useMemo(() => (texts ? findMatches(texts, searched) : []), [texts, searched])
  const hits = matches.reduce((sum, match) => sum + match.count, 0)

  const search = async (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setSearched('')
      return
    }
    let pageTexts = texts
    if (!pageTexts) {
      pageTexts = []
      for (let page = 1; page <= total; page += 1) {
        setExtracting(page)
        pageTexts.push(await extractPageText(doc.handle, page).catch(() => ''))
      }
      setExtracting(null)
      setTexts(pageTexts)
    }
    setSearched(value)
    const found = findMatches(pageTexts, value)
    setActiveMatch(0)
    if (found[0]) goTo(found[0].page)
  }

  const stepMatch = (step: number) => {
    if (!matches.length) return
    const next = (activeMatch + step + matches.length) % matches.length
    setActiveMatch(next)
    goTo(matches[next].page)
  }

  const zoomIndex = ZOOMS.indexOf(zoom as (typeof ZOOMS)[number])
  const matchedPages = new Set(matches.map((match) => match.page))

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>{showProperties && <PropertiesSection onClose={() => setShowProperties(false)} />}</AnimatePresence>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card/80 p-2 shadow-xs">
        <div className="flex items-center gap-0.5" role="group" aria-label={t('pdf.view.pageNav')}>
          <Button variant="ghost" size="icon-sm" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label={t('pdf.view.previousPage')}>
            <ChevronUpIcon />
          </Button>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const value = Number(pageInput)
              if (Number.isFinite(value)) goTo(value - 1)
              setPageInput(null)
            }}
            className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground"
          >
            <Input
              aria-label={t('pdf.view.pageNumber')}
              value={pageInput ?? String(current + 1)}
              onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ''))}
              onBlur={() => setPageInput(null)}
              inputMode="numeric"
              className="h-7 w-11 px-1 text-center text-xs"
            />
            <span>/ {total}</span>
          </form>
          <Button variant="ghost" size="icon-sm" onClick={() => goTo(current + 1)} disabled={current >= total - 1} aria-label={t('pdf.view.nextPage')}>
            <ChevronDownIcon />
          </Button>
        </div>

        <span className="h-5 w-px bg-border" aria-hidden />

        <div className="flex items-center gap-0.5" role="group" aria-label={t('pdf.view.zoom')}>
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom(ZOOMS[Math.max(0, zoomIndex - 1)])} disabled={zoomIndex <= 0} aria-label={t('pdf.view.zoomOut')}>
            <ZoomOutIcon />
          </Button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="h-7 min-w-12 cursor-pointer rounded-md px-1 text-xs font-medium tabular-nums outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            title={t('pdf.view.fitWidth')}
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomIndex + 1)])}
            disabled={zoomIndex >= ZOOMS.length - 1}
            aria-label={t('pdf.view.zoomIn')}
          >
            <ZoomInIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom(1)} aria-label={t('pdf.view.fitWidth')} className="hidden @[480px]:inline-flex">
            <MaximizeIcon />
          </Button>
        </div>

        <form onSubmit={(event) => void search(event)} className="order-last flex min-w-0 basis-full items-center gap-1 @[720px]:order-none @[720px]:ml-auto @[720px]:basis-72">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('pdf.view.findPlaceholder')}
              aria-label={t('pdf.view.find')}
              className="h-8 pl-7 text-xs"
            />
          </div>
          {searched && matches.length > 0 && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => stepMatch(-1)} aria-label={t('pdf.view.previousMatch')}>
                <ChevronUpIcon />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => stepMatch(1)} aria-label={t('pdf.view.nextMatch')}>
                <ChevronDownIcon />
              </Button>
            </>
          )}
        </form>

        <Button
          variant={showProperties ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowProperties((value) => !value)}
          aria-pressed={showProperties}
          className="gap-1"
        >
          <InfoIcon aria-hidden />
          <span className="hidden @[480px]:inline">{t('pdf.view.properties')}</span>
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {(extracting !== null || searched) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 rounded-2xl border bg-card/70 p-2.5 text-xs" role="status" aria-live="polite">
              {extracting !== null ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
                  {t('pdf.view.reading', { page: extracting, total })}
                </span>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {matches.length
                        ? t('pdf.view.matches', { count: hits, pages: matches.length })
                        : texts?.every((text) => !text.trim())
                          ? t('pdf.view.noText')
                          : t('pdf.view.noMatches', { query: searched })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setSearched('')
                        setQuery('')
                      }}
                      aria-label={t('pdf.view.clearSearch')}
                    >
                      <XIcon />
                    </Button>
                  </div>
                  {matches.length > 0 && (
                    <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
                      {matches.map((match, index) => (
                        <li key={match.page}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMatch(index)
                              goTo(match.page)
                            }}
                            className={cn(
                              'flex w-full cursor-pointer items-baseline gap-2 rounded-lg px-2 py-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                              index === activeMatch && 'bg-primary/[0.07]',
                            )}
                          >
                            <span className="shrink-0 text-[10px] font-semibold text-muted-foreground tabular-nums">
                              {t('pdf.view.pageShort', { page: match.page + 1 })}
                            </span>
                            <span className="min-w-0 truncate text-muted-foreground">
                              {match.snippet.before}
                              <mark className="rounded-sm bg-amber-300/70 px-0.5 text-foreground dark:bg-amber-400/40">{match.snippet.hit}</mark>
                              {match.snippet.after}
                            </span>
                            {match.count > 1 && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">×{match.count}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid h-[min(78dvh,1100px)] min-h-[420px] gap-3 @[760px]:grid-cols-[112px_minmax(0,1fr)]">
        <nav
          aria-label={t('pdf.view.thumbnails')}
          className="scrollbar-styled hidden flex-col gap-2 overflow-y-auto rounded-2xl border bg-card/60 p-2 @[760px]:flex"
        >
          {doc.pages.map((info, index) => (
            <button
              key={index}
              ref={(node) => {
                thumbs.current[index] = node
              }}
              type="button"
              onClick={() => goTo(index)}
              aria-current={index === current ? 'page' : undefined}
              aria-label={t('fileui.page', { index: index + 1, total })}
              className={cn(
                'group relative flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                index === current && 'bg-primary/[0.08] ring-[1.5px] ring-primary/60',
              )}
            >
              <PdfPageImage doc={doc.handle} pageNumber={index + 1} width={info.width} height={info.height} alt="" />
              <span className={cn('text-[10px] tabular-nums', index === current ? 'font-semibold text-primary' : 'text-muted-foreground')}>{index + 1}</span>
              {matchedPages.has(index) && <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-400 ring-2 ring-card" aria-hidden />}
            </button>
          ))}
        </nav>

        <div
          ref={scroller}
          className="scrollbar-both relative overflow-auto rounded-2xl border bg-muted/40 p-3 @[480px]:p-5"
          style={{
            backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          <div className="mx-auto flex flex-col items-center gap-5" style={{ width: `${zoom * 100}%`, maxWidth: zoom * FIT_WIDTH }}>
            {doc.pages.map((info, index) => (
              <figure
                key={index}
                ref={(node) => {
                  figures.current[index] = node
                }}
                data-page={index}
                className="flex w-full flex-col items-center gap-1.5"
                style={{ maxWidth: zoom * Math.max(info.width * 1.5, 320) }}
              >
                <PdfPageImage
                  doc={doc.handle}
                  pageNumber={index + 1}
                  width={info.width}
                  height={info.height}
                  eager={index < 2}
                  alt={t('fileui.page', { index: index + 1, total })}
                  className={cn('transition-shadow', searched && matchedPages.has(index) && 'ring-2 ring-amber-400/70')}
                />
                <figcaption className="text-[11px] tabular-nums text-muted-foreground">{t('fileui.page', { index: index + 1, total })}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
