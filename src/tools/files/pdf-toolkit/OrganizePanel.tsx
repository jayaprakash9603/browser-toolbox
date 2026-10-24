import { useEffect, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  CopyIcon,
  FileOutputIcon,
  FilePlus2Icon,
  FileStackIcon,
  LayoutGridIcon,
  ListChecksIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SaveIcon,
  SquareIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from 'lucide-react'

import { assemblePdf, type PageSpec, type PdfSource } from '@/core/engines/pdf/edit'
import { describePages } from '@/core/engines/pdf/ranges'
import {
  closePdfDocument,
  openPdfDocument,
  PdfPasswordError,
  readPageInfo,
  type PdfDocumentHandle,
  type PdfPageInfo,
} from '@/core/engines/pdf/pdfjs'
import { ActionBar, PanelError, PanelSection } from '@/shared/components/toolkit'
import { PAGE_CARD, releasePageImages } from '@/shared/components/pdf'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { PageThumb } from './common'
import { THUMB_GRID, THUMB_TRAY, trayFit } from './modes'
import { looksLikePdf, pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

interface Source {
  name: string
  bytes: Uint8Array
  handle: PdfDocumentHandle
  pages: PdfPageInfo[]
}

interface Item {
  id: string
  /** 0 is the open document; higher numbers are PDFs added in this panel. */
  source: number
  index: number
  turn: number
  blank?: { width: number; height: number }
}

const initialItems = (count: number): Item[] =>
  Array.from({ length: count }, (_, index) => ({ id: crypto.randomUUID(), source: 0, index, turn: 0 }))

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={onClick}
      disabled={disabled}
      className={cn('gap-1', danger && 'text-destructive hover:bg-destructive/10 hover:text-destructive')}
    >
      {icon}
      <span>{label}</span>
    </Button>
  )
}

export function OrganizePanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [extras, setExtras] = useState<Source[]>([])
  const [items, setItems] = useState<Item[]>(() => initialItems(doc.pages.length))
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [anchor, setAnchor] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const { busy, error, setError, run } = useTask()
  const fileInput = useRef<HTMLInputElement>(null)
  const owned = useRef<PdfDocumentHandle[]>([])

  useEffect(() => {
    const handles = owned.current
    return () => {
      for (const handle of handles) {
        releasePageImages(handle)
        void closePdfDocument(handle)
      }
    }
  }, [])

  const sources: Source[] = [{ name: doc.name, bytes: doc.bytes, handle: doc.handle, pages: doc.pages }, ...extras]
  const changed =
    items.length !== doc.pages.length || items.some((item, position) => item.source !== 0 || item.index !== position || item.turn !== 0 || item.blank)
  const selectedItems = items.filter((item) => selected.has(item.id))
  const pageInfo = (item: Item): PdfPageInfo => item.blank ? { ...item.blank, rotation: 0 } : sources[item.source].pages[item.index]

  const toggle = (event: MouseEvent, id: string) => {
    const next = new Set(selected)
    if (event.shiftKey && anchor) {
      const from = items.findIndex((item) => item.id === anchor)
      const to = items.findIndex((item) => item.id === id)
      const [start, end] = from < to ? [from, to] : [to, from]
      for (const item of items.slice(start, end + 1)) next.add(item.id)
    } else if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    setAnchor(id)
  }

  const rotate = (ids: ReadonlySet<string>, step: number) =>
    setItems((current) => current.map((item) => (ids.has(item.id) ? { ...item, turn: (item.turn + step + 4) % 4 } : item)))

  const remove = (ids: ReadonlySet<string>) => {
    setItems((current) => current.filter((item) => !ids.has(item.id)))
    setSelected((current) => new Set([...current].filter((id) => !ids.has(id))))
  }

  const duplicate = () =>
    setItems((current) =>
      current.flatMap((item) => (selected.has(item.id) ? [item, { ...item, id: crypto.randomUUID() }] : [item])),
    )

  const insertBlank = () => {
    const lastSelected = items.reduce((last, item, position) => (selected.has(item.id) ? position : last), -1)
    const at = lastSelected >= 0 ? lastSelected + 1 : items.length
    const reference = items[Math.max(0, at - 1)]
    const info = reference ? pageInfo(reference) : { width: 595.28, height: 841.89 }
    const sideways = reference ? reference.turn % 2 === 1 : false
    const blank: Item = {
      id: crypto.randomUUID(),
      source: 0,
      index: -1,
      turn: 0,
      blank: { width: sideways ? info.height : info.width, height: sideways ? info.width : info.height },
    }
    setItems((current) => [...current.slice(0, at), blank, ...current.slice(at)])
  }

  const move = (from: number, to: number) =>
    setItems((current) => {
      if (to < 0 || to >= current.length || from === to) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })

  const addPdf = (file: File) =>
    run(async () => {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!looksLikePdf(bytes)) throw new Error(t('pdf.doc.invalid', { name: file.name }))
      let handle: PdfDocumentHandle
      try {
        handle = await openPdfDocument(bytes)
      } catch (cause) {
        if (cause instanceof PdfPasswordError) throw new Error(t('pdf.organize.lockedSource', { name: file.name }), { cause })
        throw cause
      }
      owned.current.push(handle)
      const pages = await readPageInfo(handle)
      const sourceIndex = extras.length + 1
      setExtras((current) => [...current, { name: file.name, bytes, handle, pages }])
      setItems((current) => [...current, ...pages.map((_, index) => ({ id: crypto.randomUUID(), source: sourceIndex, index, turn: 0 }))])
    })

  const build = (subset: Item[], suffix: string) =>
    run(async () => {
      if (!subset.length) return
      const specs: PageSpec[] = subset.map((item) => {
        if (!item.blank) return { kind: 'page', source: item.source, index: item.index, rotate: item.turn * 90 }
        const { width, height } = item.blank
        return item.turn % 2 ? { kind: 'blank', width: height, height: width } : { kind: 'blank', width, height }
      })
      const pdfSources: PdfSource[] = [sourceOf(doc), ...extras.map((extra) => ({ bytes: extra.bytes }))]
      const bytes = await assemblePdf(pdfSources, specs, { metadataFrom: 0 })
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}-${suffix}.pdf`, bytes, {
            source: { name: doc.name, size: doc.bytes.length },
            note: t('pdf.organize.note', { count: subset.length }),
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
    const from = items.findIndex((item) => item.id === dragId)
    const to = items.findIndex((item) => item.id === id)
    move(from, to)
    setDragId(null)
    setOverId(null)
  }

  const selectedPositions = items.flatMap((item, position) => (selected.has(item.id) ? [position] : []))

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={t('pdf.organize.title', { count: items.length })}
        icon={<LayoutGridIcon />}
        actions={
          changed && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setItems(initialItems(doc.pages.length))
                setSelected(new Set())
                setError(null)
              }}
              disabled={busy}
            >
              <Undo2Icon aria-hidden />
              {t('pdf.organize.reset')}
            </Button>
          )
        }
      >
        <div className="sticky top-0 z-[5] -mx-1 flex min-h-9 flex-wrap items-center gap-1 rounded-xl border bg-background/90 px-1.5 py-1 backdrop-blur-md">
          <AnimatePresence mode="wait" initial={false}>
            {selected.size > 0 ? (
              <motion.div
                key="selection"
                className="flex flex-1 flex-wrap items-center gap-1"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="mr-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary tabular-nums">
                  {t('pdf.organize.selected', { count: selected.size, pages: describePages(selectedPositions) })}
                </span>
                <ToolbarButton icon={<RotateCcwIcon aria-hidden />} label={t('pdf.organize.rotateLeft')} onClick={() => rotate(selected, -1)} disabled={busy} />
                <ToolbarButton icon={<RotateCwIcon aria-hidden />} label={t('pdf.organize.rotateRight')} onClick={() => rotate(selected, 1)} disabled={busy} />
                <ToolbarButton icon={<CopyIcon aria-hidden />} label={t('pdf.organize.duplicate')} onClick={duplicate} disabled={busy} />
                <ToolbarButton
                  icon={<FileOutputIcon aria-hidden />}
                  label={t('pdf.organize.extract')}
                  onClick={() => void build(selectedItems, 'extract')}
                  disabled={busy}
                />
                <ToolbarButton icon={<Trash2Icon aria-hidden />} label={t('pdf.organize.delete')} onClick={() => remove(selected)} disabled={busy || selected.size >= items.length} danger />
                <Button variant="ghost" size="icon-xs" onClick={() => setSelected(new Set())} aria-label={t('pdf.organize.clearSelection')} className="ml-auto">
                  <XIcon />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="general"
                className="flex flex-1 flex-wrap items-center gap-1"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ToolbarButton
                  icon={<ListChecksIcon aria-hidden />}
                  label={t('pdf.organize.selectAll')}
                  onClick={() => setSelected(new Set(items.map((item) => item.id)))}
                  disabled={busy}
                />
                <ToolbarButton icon={<SquareIcon aria-hidden />} label={t('pdf.organize.insertBlank')} onClick={insertBlank} disabled={busy} />
                <ToolbarButton icon={<FilePlus2Icon aria-hidden />} label={t('pdf.organize.addPdf')} onClick={() => fileInput.current?.click()} disabled={busy} />
                <span className="ml-auto hidden px-1 text-[11px] text-muted-foreground @[640px]:inline">{t('pdf.organize.hint')}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void addPdf(file)
            }}
          />
        </div>

        <ol className={THUMB_GRID}>
          <AnimatePresence initial={false}>
            {items.map((item, position) => {
              const isSelected = selected.has(item.id)
              const info = pageInfo(item)
              const source = sources[item.source]
              const label = t('pdf.organize.pageLabel', { index: position + 1 })
              return (
                <motion.li
                  key={item.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: dragId === item.id ? 0.45 : 1, scale: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  draggable={!busy}
                  onDragStartCapture={(event: DragEvent) => {
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
                    'group relative flex cursor-grab flex-col gap-1.5 rounded-xl border bg-background/70 p-1.5 transition-colors active:cursor-grabbing',
                    isSelected && 'border-primary/60 bg-primary/[0.05] ring-2 ring-primary/25',
                    overId === item.id && dragId !== item.id && 'border-primary ring-2 ring-primary/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={(event) => toggle(event, item.id)}
                    aria-pressed={isSelected}
                    aria-label={label}
                    className="block w-full cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.blank ? (
                      <div className={THUMB_TRAY}>
                        <div
                          className={cn(PAGE_CARD, trayFit(item.turn % 2 ? info.height / info.width : info.width / info.height))}
                          style={{ aspectRatio: `${item.turn % 2 ? info.height : info.width} / ${item.turn % 2 ? info.width : info.height}` }}
                        />
                        <span className="absolute top-1 left-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-xs">
                          {position + 1}
                        </span>
                        <span className="absolute inset-x-0 bottom-3 text-center text-[10px] font-medium text-slate-400">{t('pdf.organize.blank')}</span>
                      </div>
                    ) : (
                      <PageThumb handle={source.handle} index={item.index} info={info} label="" turn={item.turn} badge={position + 1} />
                    )}
                  </button>
                  <span
                    className={cn(
                      'pointer-events-none absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full border-2 transition-all duration-150',
                      isSelected ? 'scale-100 border-primary bg-primary text-primary-foreground' : 'scale-90 border-white/90 bg-black/15 opacity-0 group-hover:opacity-100',
                    )}
                    aria-hidden
                  >
                    {isSelected && <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                  <div className="flex items-center justify-between gap-0.5 px-0.5">
                    <span className="min-w-0 truncate text-[10px] text-muted-foreground" title={item.blank ? undefined : source.name}>
                      {item.blank ? t('pdf.organize.blank') : item.source === 0 ? t('pdf.organize.originalPage', { page: item.index + 1 }) : `${source.name} · ${item.index + 1}`}
                    </span>
                    <span className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon-xs" onClick={() => rotate(new Set([item.id]), 1)} disabled={busy} aria-label={t('pdf.organize.rotatePage', { index: position + 1 })}>
                        <RotateCwIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => remove(new Set([item.id]))}
                        disabled={busy || items.length <= 1}
                        aria-label={t('pdf.organize.deletePage', { index: position + 1 })}
                      >
                        <Trash2Icon />
                      </Button>
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
        {extras.length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FileStackIcon className="size-3.5" aria-hidden />
            {t('pdf.organize.sources', { names: extras.map((extra) => extra.name).join(', ') })}
          </p>
        )}
      </PanelSection>

      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void build(items, 'organized')} disabled={busy || !items.length} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <SaveIcon aria-hidden />}
          {t('pdf.organize.save', { count: items.length })}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground" role="status" aria-live="polite">
          {changed ? t('pdf.organize.unsaved') : t('pdf.organize.noChanges')}
        </span>
      </ActionBar>
    </div>
  )
}
