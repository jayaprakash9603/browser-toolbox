import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileDownIcon,
  GripVerticalIcon,
  ImagesIcon,
  LoaderCircleIcon,
  RotateCwIcon,
  Settings2Icon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { renderPdf } from '@/core/engines/files/pdfLayout'
import {
  DEFAULT_IMAGE_PDF_OPTIONS,
  layoutImagesPdf,
  placeImage,
  type ImagePdfOptions,
  type PdfImageSource,
} from '@/core/engines/files/pdfImages'
import { FileDropZone, PreviewDialog, createArtifact, type FileArtifact } from '@/shared/components/files'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { OptionField, OptionSelect, OptionSwitch, PanelError, PanelSection } from './controls'
import { imageDimensions, imageToPdfSource, loadImage } from './convert'

interface PdfImage {
  id: string
  file: File
  url: string
  width: number
  height: number
  /** Quarter turns clockwise. */
  rotation: number
}

const IMAGE_FORMATS = ['PNG', 'JPG', 'WEBP', 'GIF', 'SVG', 'BMP', 'AVIF']

function PageThumb({ image, options }: { image: PdfImage; options: ImagePdfOptions }) {
  const odd = image.rotation % 2 === 1
  const width = odd ? image.height : image.width
  const height = odd ? image.width : image.height
  const place = placeImage(width, height, options)
  const pct = (value: number, total: number) => `${(value / total) * 100}%`
  return (
    <div
      className="relative w-full overflow-hidden rounded-[2px] bg-white shadow-[0_1px_2px_rgb(15_23_42/0.15),0_6px_18px_-8px_rgb(15_23_42/0.4)] ring-1 ring-black/5"
      style={{ aspectRatio: `${place.pageWidth} / ${place.pageHeight}` }}
    >
      <div
        className="absolute"
        style={{
          left: pct(place.x, place.pageWidth),
          top: pct(place.y, place.pageHeight),
          width: pct(place.w, place.pageWidth),
          height: pct(place.h, place.pageHeight),
        }}
      >
        <img
          src={image.url}
          alt=""
          draggable={false}
          className="absolute top-1/2 left-1/2 max-w-none transition-transform duration-300 ease-out"
          style={{
            width: odd ? `${(place.h / place.w) * 100}%` : '100%',
            height: odd ? `${(place.w / place.h) * 100}%` : '100%',
            transform: `translate(-50%, -50%) rotate(${image.rotation * 90}deg)`,
          }}
        />
      </div>
    </div>
  )
}

export function ImagesPdfPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [images, setImages] = useState<PdfImage[]>([])
  const [options, setOptions] = useState<ImagePdfOptions>(DEFAULT_IMAGE_PDF_OPTIONS)
  const [compress, setCompress] = useState(false)
  const [title, setTitle] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<FileArtifact | null>(null)
  const urls = useRef(new Set<string>())

  useEffect(() => {
    const owned = urls.current
    return () => {
      for (const url of owned) URL.revokeObjectURL(url)
    }
  }, [])

  const busy = progress !== null

  const addImages = async (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith('image/'))
    const rejected = files.filter((file) => !file.type.startsWith('image/'))
    const failed: string[] = rejected.map((file) => file.name)
    const added: PdfImage[] = []
    for (const file of accepted) {
      try {
        const image = await loadImage(file)
        const url = URL.createObjectURL(file)
        urls.current.add(url)
        added.push({ id: crypto.randomUUID(), file, url, ...imageDimensions(image), rotation: 0 })
      } catch {
        failed.push(file.name)
      }
    }
    setError(failed.length ? t('fs.pdf.skipped', { names: failed.join(', ') }) : null)
    setImages((current) => [...current, ...added])
  }

  const remove = (id: string) =>
    setImages((current) => {
      const target = current.find((image) => image.id === id)
      if (target) {
        URL.revokeObjectURL(target.url)
        urls.current.delete(target.url)
      }
      return current.filter((image) => image.id !== id)
    })

  const clear = () => {
    for (const image of images) {
      URL.revokeObjectURL(image.url)
      urls.current.delete(image.url)
    }
    setImages([])
    setError(null)
  }

  const move = (from: number, to: number) =>
    setImages((current) => {
      if (to < 0 || to >= current.length || from === to) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })

  const rotate = (id: string) =>
    setImages((current) => current.map((image) => (image.id === id ? { ...image, rotation: (image.rotation + 1) % 4 } : image)))

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
    const from = images.findIndex((image) => image.id === dragId)
    const to = images.findIndex((image) => image.id === id)
    move(from, to)
    setDragId(null)
    setOverId(null)
  }

  const build = async () => {
    if (!images.length) return
    setError(null)
    setProgress({ done: 0, total: images.length })
    try {
      const sources: PdfImageSource[] = []
      for (const [index, image] of images.entries()) {
        sources.push(await imageToPdfSource(image.file, { rotation: image.rotation, compress }))
        setProgress({ done: index + 1, total: images.length })
      }
      const name = (title.trim() || `images-${new Date().toISOString().slice(0, 10)}`).replace(/[\\/:*?"<>|]+/g, '')
      const layout = layoutImagesPdf(sources, options, title.trim() || name)
      const total = images.reduce((sum, image) => sum + image.file.size, 0)
      setArtifact(
        createArtifact({
          name: `${name}.pdf`,
          format: 'PDF',
          blob: await renderPdf(layout),
          preview: { kind: 'pdf', layout },
          source: { name: t('fs.pdf.sourceLabel', { count: images.length }), size: total },
        }),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setProgress(null)
    }
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <FileDropZone
          title={t('fs.pdf.dropTitle')}
          hint={t('fs.pdf.dropHint')}
          formats={IMAGE_FORMATS}
          glyphs={['JPG', 'PDF', 'PNG']}
          accept="image/*"
          multiple
          onFiles={(files) => void addImages(files)}
        />
        {error && <PanelError message={error} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('fs.pdf.pageTitle')} icon={<Settings2Icon />}>
        <div className="grid grid-cols-2 gap-2.5 @[640px]:grid-cols-4">
          <OptionSelect
            label={t('fs.doc.pageSize')}
            value={options.pageSize}
            onChange={(pageSize) => setOptions((current) => ({ ...current, pageSize }))}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'US Letter' },
              { value: 'fit', label: t('fs.pdf.fitImage') },
            ]}
          />
          <OptionSelect
            label={t('fs.doc.orientation')}
            value={options.orientation}
            onChange={(orientation) => setOptions((current) => ({ ...current, orientation }))}
            options={[
              { value: 'auto', label: t('fs.pdf.auto') },
              { value: 'portrait', label: t('fs.doc.portrait') },
              { value: 'landscape', label: t('fs.doc.landscape') },
            ]}
          />
          <OptionSelect
            label={t('fs.doc.margins')}
            value={options.margin}
            onChange={(margin) => setOptions((current) => ({ ...current, margin }))}
            options={[
              { value: 'none', label: t('fs.pdf.none') },
              { value: 'small', label: t('fs.pdf.small') },
              { value: 'normal', label: t('fs.doc.normal') },
            ]}
          />
          <OptionField label={t('fs.pdf.fit')}>
            <Segmented
              size="sm"
              ariaLabel={t('fs.pdf.fit')}
              value={options.fit}
              onValueChange={(fit) => setOptions((current) => ({ ...current, fit }))}
              options={[
                { value: 'contain', label: t('fs.pdf.contain') },
                { value: 'cover', label: t('fs.pdf.cover') },
              ]}
              className="h-8 w-full [&>button]:flex-1"
            />
          </OptionField>
        </div>
        <div className="grid gap-2 @[560px]:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">{t('fs.pdf.title')}</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('fs.pdf.titlePlaceholder')} className="h-8" />
          </label>
          <OptionSwitch label={t('fs.pdf.compress')} hint={t('fs.pdf.compressHint')} checked={compress} onChange={setCompress} />
        </div>
      </PanelSection>

      <PanelSection
        title={t('fs.pdf.pagesTitle', { count: images.length })}
        icon={<ImagesIcon />}
        actions={
          <Button variant="ghost" size="xs" onClick={clear} disabled={busy}>
            <Trash2Icon aria-hidden />
            {t('fs.clearAll')}
          </Button>
        }
      >
        <p className="text-[11px] text-muted-foreground">{t('fs.pdf.reorderHint')}</p>
        <ol className="grid grid-cols-2 gap-3 @[420px]:grid-cols-3 @[640px]:grid-cols-4 @[880px]:grid-cols-5">
          <AnimatePresence initial={false}>
            {images.map((image, index) => (
              <motion.li
                key={image.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: dragId === image.id ? 0.45 : 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                draggable={!busy}
                onDragStartCapture={(event: DragEvent) => {
                  setDragId(image.id)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', image.id)
                }}
                onDragEndCapture={() => {
                  setDragId(null)
                  setOverId(null)
                }}
                onDragOver={(event: DragEvent) => onDragOver(event, image.id)}
                onDrop={(event: DragEvent) => onDrop(event, image.id)}
                className={cn(
                  'group relative flex cursor-grab flex-col gap-2 rounded-xl border bg-background/70 p-2 active:cursor-grabbing',
                  overId === image.id && dragId !== image.id && 'border-primary ring-2 ring-primary/30',
                )}
              >
                <div className="relative rounded-lg bg-muted/50 p-2.5">
                  <PageThumb image={image} options={options} />
                  <span className="absolute top-1 left-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-xs">
                    {index + 1}
                  </span>
                  <GripVerticalIcon className="absolute top-1.5 right-1.5 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="truncate text-[11px] font-medium" title={image.file.name}>
                    {image.file.name}
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {image.width}×{image.height} · {formatBytes(image.file.size)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-0.5">
                  <Button variant="ghost" size="icon-xs" onClick={() => move(index, index - 1)} disabled={busy || index === 0} aria-label={t('fs.pdf.moveEarlier', { index: index + 1 })}>
                    <ArrowLeftIcon />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => rotate(image.id)} disabled={busy} aria-label={t('fs.pdf.rotate', { index: index + 1 })}>
                    <RotateCwIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, index + 1)}
                    disabled={busy || index === images.length - 1}
                    aria-label={t('fs.pdf.moveLater', { index: index + 1 })}
                  >
                    <ArrowRightIcon />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => remove(image.id)} disabled={busy} aria-label={t('fs.pdf.remove', { index: index + 1 })}>
                    <XIcon />
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <FileDropZone compact multiple accept="image/*" title={t('fs.pdf.addMore')} onFiles={(files) => void addImages(files)} />
      </PanelSection>

      {error && <PanelError message={error} />}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-2xl border bg-background/90 p-2.5 shadow-lg backdrop-blur-md">
        <Button onClick={() => void build()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <FileDownIcon aria-hidden />}
          {busy && progress
            ? t('fs.pdf.preparing', { done: progress.done, total: progress.total })
            : t('fs.pdf.build', { count: images.length })}
        </Button>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground" role="status" aria-live="polite">
          {t('fs.pdf.pageCount', { count: images.length })}
        </span>
      </div>

      <PreviewDialog
        artifacts={artifact ? [artifact] : []}
        index={artifact ? 0 : null}
        onIndexChange={(index) => {
          if (index === null) setArtifact(null)
        }}
      />
    </div>
  )
}
