import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { diffArrays } from 'diff'
import { ChevronLeftIcon, ChevronRightIcon, FileDiffIcon, GitCompareIcon, LayersIcon, LoaderCircleIcon, MinusIcon, PlusIcon, TextIcon, XIcon } from 'lucide-react'

import { editPdf, type EditItem } from '@/core/engines/pdf/edit'
import { canvasToBlob, closePdfDocument, openPdfDocument, readPageInfo, renderPdfPage, type PdfDocumentHandle, type PdfPageInfo } from '@/core/engines/pdf/pdfjs'
import { wordBoxes, type WordBox } from '@/core/engines/pdf/textLayout'
import { FileDropZone, splitFileName } from '@/shared/components/files'
import { PdfPageImage } from '@/shared/components/pdf'
import { ActionBar, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { looksLikePdf, pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { readAllPages } from './rasterize'
import { useTask } from './useTask'

type Mode = 'text' | 'overlay'

interface Other {
  name: string
  bytes: Uint8Array
  handle: PdfDocumentHandle
  pages: PdfPageInfo[]
}

interface Located extends WordBox {
  page: number
  pageWidth: number
  pageHeight: number
}

interface Change {
  kind: 'added' | 'removed'
  page: number
  text: string
}

interface Comparison {
  removed: Located[]
  added: Located[]
  changes: Change[]
}

async function locatedWords(handle: PdfDocumentHandle): Promise<Located[]> {
  const pages = await readAllPages(handle)
  return pages.flatMap((page, index) => wordBoxes(page).map((word) => ({ ...word, page: index, pageWidth: page.width, pageHeight: page.height })))
}

function compareWords(a: Located[], b: Located[]): Comparison {
  const parts = diffArrays(
    a.map((word) => word.word),
    b.map((word) => word.word),
  )
  const result: Comparison = { removed: [], added: [], changes: [] }
  let ia = 0
  let ib = 0
  for (const part of parts) {
    const count = part.value.length
    if (part.removed) {
      const words = a.slice(ia, ia + count)
      result.removed.push(...words)
      result.changes.push({ kind: 'removed', page: words[0].page, text: part.value.join(' ') })
      ia += count
    } else if (part.added) {
      const words = b.slice(ib, ib + count)
      result.added.push(...words)
      result.changes.push({ kind: 'added', page: words[0].page, text: part.value.join(' ') })
      ib += count
    } else {
      ia += count
      ib += count
    }
  }
  return result
}

/** Red where pixels only appear in the original, green where they only appear in the revision. */
async function pixelDiff(a: PdfDocumentHandle, b: PdfDocumentHandle, page: number, aPages: number, bPages: number): Promise<{ url: string; changed: number }> {
  const scale = 1.4
  const left = page < aPages ? await renderPdfPage(a, page + 1, { scale }) : null
  const right = page < bPages ? await renderPdfPage(b, page + 1, { scale }) : null
  const width = Math.max(left?.width ?? 0, right?.width ?? 0)
  const height = Math.max(left?.height ?? 0, right?.height ?? 0)
  const read = (canvas: HTMLCanvasElement | null) => {
    const out = document.createElement('canvas')
    out.width = width
    out.height = height
    const context = out.getContext('2d', { willReadFrequently: true })!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    if (canvas) context.drawImage(canvas, 0, 0)
    return context.getImageData(0, 0, width, height)
  }
  const da = read(left).data
  const db = read(right).data
  const output = new ImageData(width, height)
  const pixels = output.data
  let changed = 0
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const la = (da[offset] + da[offset + 1] + da[offset + 2]) / 3
    const lb = (db[offset] + db[offset + 1] + db[offset + 2]) / 3
    const delta = lb - la
    if (Math.abs(delta) > 40) {
      changed += 1
      const [r, g, bl] = delta < 0 ? [22, 163, 74] : [220, 38, 38]
      pixels[offset] = r
      pixels[offset + 1] = g
      pixels[offset + 2] = bl
      pixels[offset + 3] = 255
    } else {
      const shade = 255 - (255 - Math.min(la, lb)) * 0.25
      pixels[offset] = shade
      pixels[offset + 1] = shade
      pixels[offset + 2] = shade
      pixels[offset + 3] = 255
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.putImageData(output, 0, 0)
  for (const source of [left, right]) if (source) source.width = 0
  const blob = await canvasToBlob(canvas)
  canvas.width = 0
  return { url: URL.createObjectURL(blob), changed: changed / Math.max(1, width * height) }
}

function Highlights({ words, page, tone }: { words: Located[]; page: number; tone: 'added' | 'removed' }) {
  return (
    <>
      {words
        .filter((word) => word.page === page)
        .map((word, index) => (
          <span
            key={index}
            className={cn('pointer-events-none absolute rounded-[2px] mix-blend-multiply', tone === 'added' ? 'bg-emerald-400/45' : 'bg-red-400/45')}
            style={{ left: `${(word.x / word.pageWidth) * 100}%`, top: `${(word.y / word.pageHeight) * 100}%`, width: `${(word.w / word.pageWidth) * 100}%`, height: `${(word.h / word.pageHeight) * 100}%` }}
            aria-hidden
          />
        ))}
    </>
  )
}

function PageSide({ label, name, handle, pages, page, words, tone }: { label: string; name: string; handle: PdfDocumentHandle; pages: PdfPageInfo[]; page: number; words: Located[]; tone: 'added' | 'removed' }) {
  const { t } = useTranslation()
  const info = pages[page]
  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      <figcaption className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn('size-2 rounded-full', tone === 'added' ? 'bg-emerald-500' : 'bg-red-500')} aria-hidden />
        <span className="font-semibold text-foreground">{label}</span>
        <span className="truncate">{name}</span>
      </figcaption>
      {info ? (
        <div className="relative overflow-hidden rounded-md shadow-md ring-1 ring-black/5">
          <PdfPageImage doc={handle} pageNumber={page + 1} width={info.width} height={info.height} eager alt={t('fileui.page', { index: page + 1, total: pages.length })} />
          <Highlights words={words} page={page} tone={tone} />
        </div>
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground">{t('pdf.compare.noPage')}</div>
      )}
    </figure>
  )
}

/** Shows what changed between the open PDF and another version, by words or by pixels. */
export function ComparePanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [other, setOther] = useState<Other | null>(null)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('text')
  const [compared, setCompared] = useState<{ with: Other; result: Comparison } | null>(null)
  const [page, setPage] = useState(0)
  const [overlay, setOverlay] = useState<{ page: number; url: string; changed: number } | null>(null)
  const { busy, error, run } = useTask()
  const pageCount = Math.max(doc.pages.length, other?.pages.length ?? 0)
  const comparison = other && compared?.with === other ? compared.result : null

  useEffect(() => () => void (other && closePdfDocument(other.handle)), [other])

  useEffect(() => {
    if (!other) return
    let cancelled = false
    void Promise.all([locatedWords(doc.handle), locatedWords(other.handle)]).then(([a, b]) => {
      if (!cancelled) setCompared({ with: other, result: compareWords(a, b) })
    })
    return () => {
      cancelled = true
    }
  }, [doc.handle, other])

  useEffect(() => {
    if (!other || mode !== 'overlay') return
    let cancelled = false
    let url: string | null = null
    void pixelDiff(doc.handle, other.handle, page, doc.pages.length, other.pages.length).then((result) => {
      url = result.url
      if (cancelled) URL.revokeObjectURL(result.url)
      else setOverlay({ page, ...result })
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [doc.handle, doc.pages.length, other, mode, page])

  const openOther = async (file: File) => {
    setOpening(true)
    setOpenError(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!looksLikePdf(bytes)) throw new Error(t('pdf.compare.notPdf'))
      const handle = await openPdfDocument(bytes)
      setOther({ name: file.name, bytes, handle, pages: await readPageInfo(handle) })
      setPage(0)
    } catch (cause) {
      setOpenError(cause instanceof Error && /password/i.test(cause.name + cause.message) ? t('pdf.compare.locked') : t('pdf.compare.unreadable'))
    } finally {
      setOpening(false)
    }
  }

  const changedPages = useMemo(() => new Set(comparison?.changes.map((change) => change.page) ?? []), [comparison])

  const exportCopies = () =>
    run(async () => {
      if (!other || !comparison) return
      const items = (words: Located[], color: string): EditItem[] =>
        words.map((word) => ({ kind: 'rect', page: word.page, u: word.x / word.pageWidth, v: word.y / word.pageHeight, w: word.w / word.pageWidth, h: word.h / word.pageHeight, color, opacity: 0.38 }))
      const original = await editPdf(sourceOf(doc), { items: items(comparison.removed, '#ef4444') })
      const revised = await editPdf({ bytes: other.bytes }, { items: items(comparison.added, '#22c55e') })
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}-removed.pdf`, original, { note: t('pdf.compare.removedNote', { count: comparison.removed.length }) }),
          pdfArtifact(`${splitFileName(other.name).stem}-added.pdf`, revised, { note: t('pdf.compare.addedNote', { count: comparison.added.length }) }),
        ],
        zipName: `${stemOf(doc)}-comparison.zip`,
      })
    })

  if (!other) {
    return (
      <div className="flex flex-col gap-3">
        <FileDropZone title={t('pdf.compare.drop')} hint={t('pdf.compare.dropHint', { name: doc.name })} accept="application/pdf,.pdf" formats={['PDF']} glyphs={['pdf', 'pdf', 'pdf']} onFiles={(files) => files[0] && void openOther(files[0])} />
        {opening && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
            {t('pdf.compare.opening')}
          </p>
        )}
        {openError && <PanelError message={openError} />}
      </div>
    )
  }

  const pageChanges = comparison?.changes.filter((change) => change.page === page) ?? []
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel={t('pdf.compare.mode')}
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'text', label: <><TextIcon aria-hidden />{t('pdf.compare.text')}</> },
            { value: 'overlay', label: <><LayersIcon aria-hidden />{t('pdf.compare.overlay')}</> },
          ]}
        />
        {comparison ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]" role="status" aria-live="polite">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
              <PlusIcon className="size-3" aria-hidden />
              {t('pdf.compare.added', { count: comparison.added.length })}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-700 dark:text-red-300">
              <MinusIcon className="size-3" aria-hidden />
              {t('pdf.compare.removed', { count: comparison.removed.length })}
            </span>
            <span className="text-muted-foreground">{changedPages.size ? t('pdf.compare.pagesChanged', { count: changedPages.size }) : t('pdf.compare.identical')}</span>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" role="status">
            <LoaderCircleIcon className="size-3 animate-spin" aria-hidden />
            {t('pdf.compare.comparing')}
          </span>
        )}
        <Button variant="ghost" size="xs" className="ml-auto" onClick={() => setOther(null)}>
          <XIcon aria-hidden />
          {t('pdf.compare.change')}
        </Button>
      </div>

      <div className="grid items-start gap-3 @[900px]:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-muted/40 p-3">
          {mode === 'text' ? (
            <div className="grid grid-cols-2 gap-3">
              <PageSide label={t('pdf.compare.original')} name={doc.name} handle={doc.handle} pages={doc.pages} page={page} words={comparison?.removed ?? []} tone="removed" />
              <PageSide label={t('pdf.compare.revised')} name={other.name} handle={other.handle} pages={other.pages} page={page} words={comparison?.added ?? []} tone="added" />
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" aria-hidden />{t('pdf.compare.onlyOriginal')}</span>
                <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" aria-hidden />{t('pdf.compare.onlyRevised')}</span>
                {overlay?.page === page && <span className="ml-auto tabular-nums">{t('pdf.compare.pixels', { value: (overlay.changed * 100).toFixed(overlay.changed < 0.01 ? 2 : 1) })}</span>}
              </div>
              {overlay?.page === page ? (
                <img src={overlay.url} alt={t('pdf.compare.overlayAlt', { page: page + 1 })} className="w-full rounded-md shadow-md ring-1 ring-black/5" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-md bg-background">
                  <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" aria-hidden />
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label={t('pdf.view.previousPage')}>
              <ChevronLeftIcon />
            </Button>
            <span className="text-[11px] tabular-nums text-muted-foreground">{t('fileui.page', { index: page + 1, total: pageCount })}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={page >= pageCount - 1} aria-label={t('pdf.view.nextPage')}>
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <PanelSection title={t('pdf.compare.changes')} icon={<FileDiffIcon />} className="@[900px]:sticky @[900px]:top-2">
          {comparison && changedPages.size > 0 && (
            <div className="flex flex-wrap gap-1" aria-label={t('pdf.compare.jump')}>
              {[...changedPages].sort((a, b) => a - b).map((index) => (
                <Button key={index} variant={index === page ? 'secondary' : 'outline'} size="xs" onClick={() => setPage(index)} className="tabular-nums">
                  {index + 1}
                </Button>
              ))}
            </div>
          )}
          {pageChanges.length ? (
            <ul className="flex max-h-[50dvh] flex-col gap-1.5 overflow-auto">
              {pageChanges.slice(0, 120).map((change, index) => (
                <li key={index} className={cn('rounded-lg border-l-2 bg-background/70 px-2 py-1 text-xs', change.kind === 'added' ? 'border-emerald-500' : 'border-red-500')}>
                  <span className="sr-only">{t(`pdf.compare.${change.kind}Label`)}</span>
                  <span className={cn(change.kind === 'removed' && 'text-muted-foreground line-through')}>{change.text.length > 160 ? `${change.text.slice(0, 160)}…` : change.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">{comparison ? t('pdf.compare.noChangesHere') : t('pdf.compare.comparing')}</p>
          )}
        </PanelSection>
      </div>

      {error && <PanelError message={error} />}
      <ActionBar>
        <Button onClick={() => void exportCopies()} disabled={busy || !comparison || !changedPages.size} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <GitCompareIcon aria-hidden />}
          {t('pdf.compare.export')}
        </Button>
      </ActionBar>
    </div>
  )
}
