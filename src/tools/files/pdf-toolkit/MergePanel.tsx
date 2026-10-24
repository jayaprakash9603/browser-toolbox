import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowDownIcon, ArrowUpIcon, CombineIcon, FilePlus2Icon, GripVerticalIcon, LoaderCircleIcon, Trash2Icon, XIcon } from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { assemblePdf, type PageSpec, type PdfSource } from '@/core/engines/pdf/edit'
import { parsePageRanges } from '@/core/engines/pdf/ranges'
import {
  closePdfDocument,
  openPdfDocument,
  PdfPasswordError,
  readPageInfo,
  type PdfDocumentHandle,
  type PdfPageInfo,
} from '@/core/engines/pdf/pdfjs'
import { FileDropZone } from '@/shared/components/files'
import { ActionBar, OptionField, PanelError, PanelSection } from '@/shared/components/toolkit'
import { PdfPageImage, releasePageImages } from '@/shared/components/pdf'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'
import { rangeIssueMessage } from './rangeText'
import { toEmbeddableImage, type EmbeddableImage } from './raster'
import { looksLikePdf, pdfArtifact, usePdfSession } from './session'
import { useTask } from './useTask'

type MergeItem = {
  id: string
  name: string
  size: number
  range: string
} & (
  | { kind: 'pdf'; bytes: Uint8Array; password?: string; handle: PdfDocumentHandle; pages: PdfPageInfo[]; owned: boolean; docId?: string }
  | { kind: 'image'; image: EmbeddableImage; url: string }
)

/** Image pages are sized like a 96 DPI print, capped to the long side of A4. */
function imagePageSize(width: number, height: number) {
  const scale = Math.min(0.75, 842 / Math.max(width, height))
  return { width: width * scale, height: height * scale }
}

function pagesFor(item: Extract<MergeItem, { kind: 'pdf' }>) {
  if (!item.range.trim()) return { ok: true as const, pages: item.pages.map((_, index) => index) }
  const result = parsePageRanges(item.range, item.pages.length)
  return result.ok ? { ok: true as const, pages: result.groups.flat() } : { ok: false as const, issue: result.issue }
}

const ACCEPT = 'application/pdf,.pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,image/svg+xml'

export function MergePanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { state, showResults } = usePdfSession()
  const [items, setItems] = useState<MergeItem[]>([])
  const [name, setName] = useState('merged')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [skipped, setSkipped] = useState<string | null>(null)
  const { busy, error, run } = useTask()
  const latest = useRef(items)
  useEffect(() => {
    latest.current = items
  }, [items])

  useEffect(
    () => () => {
      for (const item of latest.current) disposeItem(item)
    },
    [],
  )

  const open = state.status === 'ready' ? state.doc : null
  const hasOpen = open ? items.some((item) => item.kind === 'pdf' && item.docId === open.id) : true

  const addFiles = async (files: File[]) => {
    setAdding(true)
    const failed: string[] = []
    const added: MergeItem[] = []
    for (const file of files) {
      try {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const bytes = new Uint8Array(await file.arrayBuffer())
          if (!looksLikePdf(bytes)) throw new Error('not a pdf')
          const handle = await openPdfDocument(bytes)
          const pages = await readPageInfo(handle)
          added.push({ id: crypto.randomUUID(), kind: 'pdf', name: file.name, size: file.size, range: '', bytes, handle, pages, owned: true })
        } else if (file.type.startsWith('image/')) {
          const image = await toEmbeddableImage(file)
          added.push({ id: crypto.randomUUID(), kind: 'image', name: file.name, size: file.size, range: '', image, url: URL.createObjectURL(file) })
        } else {
          failed.push(file.name)
        }
      } catch (cause) {
        failed.push(cause instanceof PdfPasswordError ? t('pdf.merge.lockedName', { name: file.name }) : file.name)
      }
    }
    setSkipped(failed.length ? t('pdf.merge.skipped', { names: failed.join(', ') }) : null)
    setItems((current) => [...current, ...added])
    setAdding(false)
  }

  const addOpen = () => {
    if (!open) return
    setItems((current) => [
      {
        id: crypto.randomUUID(),
        kind: 'pdf',
        name: open.name,
        size: open.bytes.length,
        range: '',
        bytes: open.bytes,
        password: open.password,
        handle: open.handle,
        pages: open.pages,
        owned: false,
        docId: open.id,
      },
      ...current,
    ])
  }

  const remove = (id: string) =>
    setItems((current) => {
      const target = current.find((item) => item.id === id)
      if (target) disposeItem(target)
      return current.filter((item) => item.id !== id)
    })

  const clear = () => {
    for (const item of items) disposeItem(item)
    setItems([])
    setSkipped(null)
  }

  const move = (from: number, to: number) =>
    setItems((current) => {
      if (to < 0 || to >= current.length || from === to) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })

  const setRange = (id: string, range: string) => setItems((current) => current.map((item) => (item.id === id ? { ...item, range } : item)))

  const plans = items.map((item) => (item.kind === 'pdf' ? pagesFor(item) : { ok: true as const, pages: [0] }))
  const totalPages = plans.reduce((sum, plan) => sum + (plan.ok ? plan.pages.length : 0), 0)
  const invalid = plans.some((plan) => !plan.ok)

  const merge = () =>
    run(async () => {
      const sources: PdfSource[] = []
      const specs: PageSpec[] = []
      items.forEach((item, position) => {
        const plan = plans[position]
        if (!plan.ok) return
        if (item.kind === 'image') {
          specs.push({ kind: 'image', bytes: item.image.bytes, format: item.image.format, ...imagePageSize(item.image.width, item.image.height) })
          return
        }
        const source = sources.push({ bytes: item.bytes, password: item.password }) - 1
        for (const index of plan.pages) specs.push({ kind: 'page', source, index })
      })
      const firstPdf = items.findIndex((item) => item.kind === 'pdf')
      const bytes = await assemblePdf(sources, specs, { metadataFrom: firstPdf >= 0 ? 0 : undefined })
      const clean = (name.trim() || 'merged').replace(/[\\/:*?"<>|]+/g, '').replace(/\.pdf$/i, '')
      showResults({
        artifacts: [
          pdfArtifact(`${clean}.pdf`, bytes, {
            source: { name: t('pdf.merge.sourceLabel', { count: items.length }), size: items.reduce((sum, item) => sum + item.size, 0) },
            note: t('pdf.merge.note'),
          }),
        ],
      })
    })

  const onDragOver = (event: DragEvent, id: string) => {
    if (!dragId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (overId !== id) setOverId(id)
  }

  const onDrop = (event: DragEvent, id: string) => {
    if (!dragId) return
    event.preventDefault()
    event.stopPropagation()
    move(
      items.findIndex((item) => item.id === dragId),
      items.findIndex((item) => item.id === id),
    )
    setDragId(null)
    setOverId(null)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <FileDropZone
          title={t('pdf.merge.dropTitle')}
          hint={t('pdf.merge.dropHint')}
          formats={['PDF', 'PNG', 'JPG', 'WEBP', 'GIF', 'SVG']}
          glyphs={['PDF', 'PDF', 'JPG']}
          accept={ACCEPT}
          multiple
          onFiles={(files) => void addFiles(files)}
        />
        {open && (
          <Button variant="outline" size="sm" onClick={addOpen} className="self-center">
            <FilePlus2Icon aria-hidden />
            {t('pdf.merge.addOpen', { name: open.name })}
          </Button>
        )}
        {adding && (
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
            <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />
            {t('pdf.merge.reading')}
          </p>
        )}
        {skipped && <PanelError message={skipped} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={t('pdf.merge.title', { count: items.length })}
        icon={<CombineIcon />}
        actions={
          <Button variant="ghost" size="xs" onClick={clear} disabled={busy}>
            <Trash2Icon aria-hidden />
            {t('pdf.clearAll')}
          </Button>
        }
      >
        <p className="text-[11px] text-muted-foreground">{t('pdf.merge.hint')}</p>
        <ol className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((item, position) => {
              const plan = plans[position]
              return (
                <motion.li
                  key={item.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: dragId === item.id ? 0.45 : 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -20, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  draggable={!busy}
                  onDragStartCapture={(event: DragEvent) => {
                    if ((event.target as HTMLElement).closest('input')) return
                    setDragId(item.id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', item.id)
                  }}
                  onDragEndCapture={() => {
                    setDragId(null)
                    setOverId(null)
                  }}
                  onDragOver={(event: DragEvent) => onDragOver(event, item.id)}
                  onDrop={(event: DragEvent) => onDrop(event, item.id)}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-xl border bg-background/70 p-2 @[480px]:gap-3',
                    overId === item.id && dragId !== item.id && 'border-primary ring-2 ring-primary/30',
                  )}
                >
                  <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground/60 group-hover:text-muted-foreground" aria-hidden />
                  <span className="flex w-6 shrink-0 justify-center text-xs font-bold text-muted-foreground tabular-nums">{position + 1}</span>
                  <div className="w-11 shrink-0 @[480px]:w-14">
                    {item.kind === 'pdf' ? (
                      <PdfPageImage doc={item.handle} pageNumber={1} width={item.pages[0].width} height={item.pages[0].height} alt="" />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        draggable={false}
                        className="w-full rounded-[3px] bg-white object-contain shadow-sm ring-1 ring-black/5"
                        style={{ aspectRatio: `${item.image.width} / ${item.image.height}` }}
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-xs font-semibold" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {item.kind === 'pdf'
                        ? t('pdf.merge.pdfMeta', { count: item.pages.length, size: formatBytes(item.size) })
                        : t('pdf.merge.imageMeta', { width: item.image.width, height: item.image.height, size: formatBytes(item.size) })}
                    </p>
                    {item.kind === 'pdf' && item.pages.length > 1 && (
                      <div className="flex flex-col gap-0.5">
                        <Input
                          value={item.range}
                          onChange={(event) => setRange(item.id, event.target.value)}
                          placeholder={t('pdf.merge.allPages', { count: item.pages.length })}
                          aria-label={t('pdf.merge.rangeLabel', { name: item.name })}
                          aria-invalid={!plan.ok || undefined}
                          className="h-7 max-w-56 text-xs"
                        />
                        {!plan.ok && <span className="text-[10px] text-destructive">{rangeIssueMessage(t, plan.issue)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5 @[480px]:flex-row">
                    <Button variant="ghost" size="icon-xs" onClick={() => move(position, position - 1)} disabled={busy || position === 0} aria-label={t('pdf.merge.moveUp', { name: item.name })}>
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => move(position, position + 1)}
                      disabled={busy || position === items.length - 1}
                      aria-label={t('pdf.merge.moveDown', { name: item.name })}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => remove(item.id)} disabled={busy} aria-label={t('pdf.merge.remove', { name: item.name })}>
                      <XIcon />
                    </Button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
        <div className="flex flex-col gap-2 @[560px]:flex-row">
          <FileDropZone
            compact
            multiple
            accept={ACCEPT}
            title={adding ? t('pdf.merge.reading') : t('pdf.merge.addMore')}
            onFiles={(files) => void addFiles(files)}
            className="flex-1"
          />
          {!hasOpen && (
            <Button variant="outline" onClick={addOpen} className="h-auto min-h-12 justify-start gap-2 rounded-xl px-3 text-left">
              <FilePlus2Icon aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-medium">{t('pdf.merge.addOpenShort')}</span>
                <span className="max-w-48 truncate text-xs font-normal text-muted-foreground">{open?.name}</span>
              </span>
            </Button>
          )}
        </div>
        {skipped && <PanelError message={skipped} />}
      </PanelSection>

      <PanelSection title={t('pdf.merge.output')} icon={<FilePlus2Icon />}>
        <OptionField label={t('pdf.merge.fileName')} className="max-w-sm">
          <div className="flex items-center gap-1">
            <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8" />
            <span className="text-xs text-muted-foreground">.pdf</span>
          </div>
        </OptionField>
      </PanelSection>

      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void merge()} disabled={busy || invalid || totalPages === 0} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <CombineIcon aria-hidden />}
          {t('pdf.merge.build', { count: items.length })}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">
          {t('pdf.merge.total', { count: totalPages })}
        </span>
      </ActionBar>
    </div>
  )
}

function disposeItem(item: MergeItem) {
  if (item.kind === 'image') URL.revokeObjectURL(item.url)
  else if (item.owned) {
    releasePageImages(item.handle)
    void closePdfDocument(item.handle)
  }
}
