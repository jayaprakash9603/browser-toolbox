import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CameraIcon,
  CameraOffIcon,
  ExternalLinkIcon,
  EyeIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  RotateCwIcon,
  ScanLineIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'

import { layoutImagesPdf, type ImagePageSize, type PdfImageSource } from '@/core/engines/files/pdfImages'
import { renderPdf } from '@/core/engines/files/pdfLayout'
import { useRouter } from '@/app/router'
import { ActionBar, OptionField, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { PdfPagesPreview } from '@/shared/components/files'
import { attachCameraPreview, classifyCameraError, requestCameraStream } from '@/shared/media/requestCameraStream'
import { cn } from '@/shared/utils/cn'
import { decodeImage } from './raster'
import {
  pollOffscreenCameraFrame,
  prepareOffscreenCamera,
  snapOffscreenCamera,
  startOffscreenCamera,
  stopOffscreenCamera,
} from './offscreenCamera'
import { openPdfToolkitTab } from './openInTab'
import { pdfArtifact, usePdfSession } from './session'
import { useTask } from './useTask'
import { loadScanDraft, persistScanDraft } from './workspace'
import { usePdfToolkitWorkspace } from './workspaceContext'

type Filter = 'color' | 'enhance' | 'gray' | 'bw'

const FILTERS: Record<Filter, string> = {
  color: 'none',
  enhance: 'contrast(1.35) brightness(1.08) saturate(1.15)',
  gray: 'grayscale(1) contrast(1.15)',
  bw: 'grayscale(1) contrast(2.6) brightness(1.15)',
}

interface ScanPage {
  id: string
  blob: Blob
  url: string
  turn: number
}

async function renderScan(page: ScanPage, filter: Filter): Promise<PdfImageSource> {
  const image = await decodeImage(page.blob)
  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight))
  const w = Math.round(image.naturalWidth * scale)
  const h = Math.round(image.naturalHeight * scale)
  const sideways = page.turn % 2 === 1
  const canvas = document.createElement('canvas')
  canvas.width = sideways ? h : w
  canvas.height = sideways ? w : h
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.filter = FILTERS[filter]
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((page.turn * Math.PI) / 2)
  context.drawImage(image, -w / 2, -h / 2, w, h)
  const source = { src: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height, format: 'JPEG' as const }
  canvas.width = 0
  return source
}

/** Photographs paper documents with the camera, or takes photos you already have, and makes a PDF. */
export function ScanPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { path, search } = useRouter()
  const workspace = usePdfToolkitWorkspace()
  const { showResults } = usePdfSession()
  const video = useRef<HTMLVideoElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [offscreenPreview, setOffscreenPreview] = useState<string | null>(null)
  const [offscreenActive, setOffscreenActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [pages, setPages] = useState<ScanPage[]>([])
  const [filter, setFilter] = useState<Filter>('enhance')
  const [pageSize, setPageSize] = useState<ImagePageSize>('a4')
  const [flash, setFlash] = useState(0)
  const { busy, error, run } = useTask()
  const urls = useRef(new Set<string>())
  const [scanDraftReady, setScanDraftReady] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<ReturnType<typeof layoutImagesPdf> | null>(null)
  const [previewBusy, setPreviewBusy] = useState(false)
  const restoredScan = useRef(false)

  useEffect(() => {
    const element = video.current
    if (!element || !stream) return
    void attachCameraPreview(element, stream)
  }, [stream])

  useEffect(() => {
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [stream])

  useEffect(() => {
    if (!offscreenActive) {
      setOffscreenPreview(null)
      return
    }
    let active = true
    const tick = () => {
      void pollOffscreenCameraFrame().then((frame) => {
        if (active && frame) setOffscreenPreview(frame)
      })
    }
    tick()
    const timer = window.setInterval(tick, 150)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [offscreenActive])

  useEffect(() => {
    const owned = urls.current
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url))
      if (offscreenActive) void stopOffscreenCamera()
    }
  }, [offscreenActive])

  useEffect(() => {
    if (restoredScan.current) return
    restoredScan.current = true
    let cancelled = false
    void loadScanDraft().then((draft) => {
      if (cancelled) return
      if (draft) {
        setFilter(draft.filter)
        setPageSize(draft.pageSize)
        const next = draft.pages.map((page) => {
          const url = URL.createObjectURL(page.blob)
          urls.current.add(url)
          return { id: page.id, blob: page.blob, url, turn: page.turn }
        })
        setPages(next)
      }
      setScanDraftReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const flushScanDraft = useCallback(async () => {
    await persistScanDraft(
      pages.map((page) => ({ id: page.id, blob: page.blob, turn: page.turn })),
      filter,
      pageSize,
    )
  }, [pages, filter, pageSize])

  useEffect(() => {
    workspace?.registerScanFlush(() => flushScanDraft())
    return () => workspace?.registerScanFlush(null)
  }, [workspace, flushScanDraft])

  useEffect(() => {
    if (!scanDraftReady) return
    const timer = window.setTimeout(() => {
      void flushScanDraft()
    }, 350)
    return () => window.clearTimeout(timer)
  }, [scanDraftReady, flushScanDraft])

  useEffect(() => {
    let cancelled = false
    if (!pages.length) {
      setPdfPreview(null)
      return
    }
    setPreviewBusy(true)
    void (async () => {
      try {
        const sources: PdfImageSource[] = []
        for (const page of pages.slice(0, 8)) sources.push(await renderScan(page, filter))
        const layout = layoutImagesPdf(sources, { pageSize, orientation: 'auto', margin: 'none', fit: 'contain' }, 'Scan')
        if (!cancelled) setPdfPreview(layout)
      } finally {
        if (!cancelled) setPreviewBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pages, filter, pageSize])

  const addBlobs = (blobs: Blob[]) => {
    const next = blobs.map((blob) => {
      const url = URL.createObjectURL(blob)
      urls.current.add(url)
      return { id: crypto.randomUUID(), blob, url, turn: 0 }
    })
    setPages((current) => [...current, ...next])
  }

  const openScanInTab = () => {
    void (async () => {
      await workspace?.flushAll()
      const hashRoute = `${path}${search || '?tab=scan'}`
      openPdfToolkitTab(hashRoute)
    })()
  }

  const stopCamera = () => {
    if (offscreenActive) void stopOffscreenCamera()
    setOffscreenActive(false)
    setStream(null)
  }

  const startCamera = async () => {
    setStarting(true)
    setCameraError(null)
    setOffscreenActive(false)
    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
    try {
      setStream(await requestCameraStream())
    } catch (cause) {
      const kind = classifyCameraError(cause)
      if (kind === 'denied') {
        setCameraError(t('pdf.scan.denied'))
        return
      }
      try {
        await prepareOffscreenCamera()
        await startOffscreenCamera()
        setOffscreenActive(true)
      } catch {
        setCameraError(kind === 'unsupported' ? t('pdf.scan.denied') : t('pdf.scan.noCamera'))
      }
    } finally {
      setStarting(false)
    }
  }

  const capture = () => {
    if (offscreenActive) {
      void snapOffscreenCamera().then((blob) => {
        if (blob) addBlobs([blob])
        setFlash((value) => value + 1)
      })
      return
    }
    const element = video.current
    if (!element || !element.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = element.videoWidth
    canvas.height = element.videoHeight
    canvas.getContext('2d')?.drawImage(element, 0, 0)
    canvas.toBlob((blob) => blob && addBlobs([blob]), 'image/jpeg', 0.92)
    setFlash((value) => value + 1)
  }

  const cameraLive = Boolean(stream || offscreenActive)

  const removePage = (id: string) =>
    setPages((current) => {
      const page = current.find((entry) => entry.id === id)
      if (page) {
        URL.revokeObjectURL(page.url)
        urls.current.delete(page.url)
      }
      return current.filter((entry) => entry.id !== id)
    })

  const build = () =>
    run(async () => {
      const sources: PdfImageSource[] = []
      for (const page of pages) sources.push(await renderScan(page, filter))
      const layout = layoutImagesPdf(sources, { pageSize, orientation: 'auto', margin: 'none', fit: 'contain' }, 'Scan')
      const bytes = new Uint8Array(await (await renderPdf(layout)).arrayBuffer())
      const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
      showResults({ artifacts: [pdfArtifact(`scan-${stamp}.pdf`, bytes, { note: t('pdf.scan.note', { count: pages.length }) })] })
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 @[820px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <PanelSection
          title={t('pdf.scan.camera')}
          icon={<CameraIcon />}
          actions={
            cameraLive ? (
              <Button variant="ghost" size="xs" onClick={stopCamera}>
                <CameraOffIcon aria-hidden />
                {t('pdf.scan.stop')}
              </Button>
            ) : null
          }
        >
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-neutral-900">
            {cameraLive ? (
              <>
                {stream ? (
                  <video ref={video} autoPlay playsInline muted className="size-full object-contain" style={{ filter: FILTERS[filter] }} />
                ) : (
                  offscreenPreview && (
                    <img src={offscreenPreview} alt="" className="size-full object-contain" style={{ filter: FILTERS[filter] }} />
                  )
                )}
                <span className="pointer-events-none absolute inset-[8%] rounded-lg border-2 border-dashed border-white/50" aria-hidden />
                <AnimatePresence>
                  {flash > 0 && (
                    <motion.span key={flash} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: reduce ? 0 : 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} aria-hidden />
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={capture}
                  aria-label={t('pdf.scan.capture')}
                  className="absolute bottom-3 left-1/2 flex size-14 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-4 border-white/80 bg-white/20 outline-none backdrop-blur transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                >
                  <span className="size-10 rounded-full bg-white" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center text-white">
                <ScanLineIcon className="size-10 opacity-70" aria-hidden />
                <p className="max-w-xs text-xs text-white/70">{cameraError ?? t('pdf.scan.intro')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => void startCamera()} disabled={starting} size="sm">
                    {starting ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <CameraIcon aria-hidden />}
                    {t('pdf.scan.start')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => upload.current?.click()}>
                    <ImagePlusIcon aria-hidden />
                    {t('pdf.scan.upload')}
                  </Button>
                  {cameraError && (
                    <Button variant="secondary" size="sm" onClick={openScanInTab}>
                      <ExternalLinkIcon aria-hidden />
                      {t('pdf.scan.openTab')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <input
            ref={upload}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const picked = [...(event.target.files ?? [])]
              event.target.value = ''
              if (picked.length) addBlobs(picked)
            }}
          />
        </PanelSection>

        <PanelSection
          title={t('pdf.scan.pages', { count: pages.length })}
          icon={<SlidersHorizontalIcon />}
          actions={
            <Button variant="ghost" size="xs" onClick={() => upload.current?.click()}>
              <ImagePlusIcon aria-hidden />
              {t('pdf.scan.addPhotos')}
            </Button>
          }
        >
          <OptionField label={t('pdf.scan.filter')}>
            <Segmented ariaLabel={t('pdf.scan.filter')} value={filter} onValueChange={setFilter} options={(Object.keys(FILTERS) as Filter[]).map((value) => ({ value, label: t(`pdf.scan.filters.${value}`) }))} className="self-start" />
          </OptionField>
          <OptionField label={t('pdf.images.pageSize')}>
            <Segmented
              ariaLabel={t('pdf.images.pageSize')}
              value={pageSize}
              onValueChange={setPageSize}
              options={[
                { value: 'a4', label: 'A4' },
                { value: 'letter', label: t('pdf.images.letter') },
                { value: 'fit', label: t('pdf.images.fitImage') },
              ]}
              className="self-start"
            />
          </OptionField>
          {pages.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/35 p-3">
              <div className="flex items-center gap-2">
                <EyeIcon className="size-3.5 text-primary" aria-hidden />
                <p className="flex-1 text-xs font-semibold">{t('pdf.images.preview')}</p>
                {previewBusy && <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
              </div>
              {pdfPreview ? (
                <>
                  <PdfPagesPreview layout={pdfPreview} initialPages={8} compact />
                  {pages.length > 8 && (
                    <p className="text-center text-[11px] text-muted-foreground">{t('pdf.images.more', { count: pages.length - 8 })}</p>
                  )}
                </>
              ) : (
                <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-[11px] text-muted-foreground">
                  {previewBusy ? t('pdf.scan.previewLoading') : t('pdf.scan.previewEmpty')}
                </div>
              )}
            </div>
          )}
          {pages.length ? (
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
              <AnimatePresence initial={false}>
                {pages.map((page, index) => (
                  <motion.li
                    key={page.id}
                    layout={!reduce}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border bg-muted/50"
                  >
                    <img
                      src={page.url}
                      alt={t('fileui.page', { index: index + 1, total: pages.length })}
                      className={cn('max-h-full max-w-full object-contain transition-transform duration-200', page.turn % 2 === 1 && 'scale-75')}
                      style={{ filter: FILTERS[filter], transform: `rotate(${page.turn * 90}deg)` }}
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white tabular-nums">{index + 1}</span>
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-100 transition-opacity @[820px]:opacity-0 @[820px]:group-focus-within:opacity-100 @[820px]:group-hover:opacity-100">
                      <Button variant="secondary" size="icon-xs" onClick={() => setPages((current) => current.map((entry) => (entry.id === page.id ? { ...entry, turn: (entry.turn + 1) % 4 } : entry)))} aria-label={t('pdf.rotate.pageRight', { page: index + 1 })}>
                        <RotateCwIcon />
                      </Button>
                      <Button variant="secondary" size="icon-xs" onClick={() => removePage(page.id)} aria-label={t('pdf.scan.remove', { page: index + 1 })}>
                        <XIcon />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed px-3 py-6 text-center text-[11px] text-muted-foreground">{t('pdf.scan.empty')}</p>
          )}
        </PanelSection>
      </div>
      {error && <PanelError message={error} />}
      <ActionBar>
        <Button onClick={() => void build()} disabled={busy || !pages.length} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <ScanLineIcon aria-hidden />}
          {t('pdf.scan.run', { count: pages.length })}
        </Button>
      </ActionBar>
    </div>
  )
}
