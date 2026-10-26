import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DownloadIcon, ImageUpIcon, LoaderCircleIcon, RefreshCwIcon, TrophyIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { convertImageBytes, type ConvertedImage } from '@/chrome/offscreen/imageConvert'
import { FORMAT_LABELS, IMAGE_SAVE_FORMATS, suggestFilename, type ImageSaveFormat, type SaveImageAsState } from '@/core/imageConvert'
import { PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { CHECKERBOARD, EASE_OUT, formatBytes } from './formatMeta'
import { FormatBadge } from './parts'

interface Source {
  name: string
  bytes: Uint8Array
  mime: string
  previewUrl: string
  width: number
  height: number
}

type Result = { key: string } & ({ ok: true; out: ConvertedImage } | { ok: false; error: string })

async function readSource(file: File): Promise<Source> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const previewUrl = URL.createObjectURL(file)
  const img = new Image()
  img.src = previewUrl
  try {
    await img.decode()
  } catch {
    URL.revokeObjectURL(previewUrl)
    throw new Error('unsupported')
  }
  return { name: file.name || 'pasted-image.png', bytes, mime: file.type, previewUrl, width: img.naturalWidth, height: img.naturalHeight }
}

export function TryItPanel({ state }: { state: SaveImageAsState }) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [results, setResults] = useState<Partial<Record<ImageSaveFormat, Result>>>({})
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const { quality, maxSize, background } = state
  const optionsKey = `${source?.previewUrl}|${quality}|${maxSize}|${background}`

  const load = async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) {
      if (file) setError(t('sia.try.unsupported'))
      return
    }
    try {
      const next = await readSource(file)
      setError(null)
      setResults({})
      setSource(next)
    } catch {
      setError(t('sia.try.unsupported'))
    }
  }

  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) void loadRef.current(file)
    }
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  useEffect(() => {
    const url = source?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [source])

  useEffect(() => {
    if (!source) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      for (const format of IMAGE_SAVE_FORMATS) {
        if (cancelled) return
        let result: Result
        try {
          const out = await convertImageBytes(source.bytes, source.mime, format, { quality, maxSize, background })
          result = { key: optionsKey, ok: true, out }
        } catch (err) {
          result = { key: optionsKey, ok: false, error: err instanceof Error ? err.message : String(err) }
        }
        if (cancelled) return
        setResults((prev) => ({ ...prev, [format]: result }))
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [source, quality, maxSize, background, optionsKey])

  const download = (format: ImageSaveFormat, out: ConvertedImage) => {
    const url = URL.createObjectURL(new Blob([new Uint8Array(out.bytes)], { type: out.mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = suggestFilename(format, { imageUrl: `https://local/${encodeURIComponent(source?.name ?? 'image')}` }, 'image')
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    void load(event.dataTransfer.files[0])
  }

  const done = IMAGE_SAVE_FORMATS.map((f) => results[f]).filter((r): r is Result & { ok: true } => !!r?.ok && r.key === optionsKey)
  const largest = Math.max(source?.bytes.length ?? 1, ...done.map((r) => r.out.bytes.length))
  const smallest = done.length === IMAGE_SAVE_FORMATS.length ? Math.min(...done.map((r) => r.out.bytes.length)) : null

  return (
    <PanelSection
      title={t('sia.try.title')}
      icon={<ImageUpIcon />}
      actions={
        source && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={() => inputRef.current?.click()}>
              <RefreshCwIcon />
              {t('sia.try.replace')}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('sia.try.clear')}
              title={t('sia.try.clear')}
              onClick={() => {
                setSource(null)
                setResults({})
              }}
            >
              <XIcon />
            </Button>
          </div>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void load(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {!source ? (
          <motion.button
            key="drop"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, scale: dragging ? 1.015 : 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-primary/[0.03]',
            )}
          >
            <motion.span
              className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
              animate={dragging ? { y: -4, scale: 1.08 } : { y: [0, -3, 0] }}
              transition={dragging ? { type: 'spring', stiffness: 400, damping: 18 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            >
              <ImageUpIcon className="size-5" />
            </motion.span>
            <span className="text-xs font-semibold">{t('sia.try.drop')}</span>
            <span className="max-w-64 text-[11px] leading-4 text-muted-foreground">{t('sia.try.dropHint')}</span>
          </motion.button>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-2">
              <div className={cn('flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border', CHECKERBOARD)}>
                <img src={source.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold" title={source.name}>
                  {source.name}
                </p>
                <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {source.width} × {source.height} · {formatBytes(source.bytes.length)}
                </p>
              </div>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t('sia.try.original')}</span>
            </div>

            <ul className="flex flex-col gap-1.5" aria-live="polite">
              {IMAGE_SAVE_FORMATS.map((format, index) => {
                const result = results[format]
                const fresh = result?.key === optionsKey
                const size = result?.ok ? result.out.bytes.length : 0
                const delta = result?.ok ? Math.round(((size - source.bytes.length) / source.bytes.length) * 100) : 0
                const inMenu = state.formats.includes(format)
                return (
                  <motion.li
                    key={format}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, ease: EASE_OUT, delay: index * 0.04 }}
                    className={cn('flex items-center gap-2.5 rounded-xl border bg-card px-2 py-1.5', !inMenu && 'opacity-70')}
                  >
                    <FormatBadge format={format} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold">{FORMAT_LABELS[format]}</span>
                        {result?.ok && (
                          <span className="font-mono text-[11px] tabular-nums text-foreground/80">{formatBytes(size)}</span>
                        )}
                        {result?.ok && (
                          <span
                            className={cn(
                              'font-mono text-[10px] font-medium tabular-nums',
                              delta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {delta > 0 ? `+${delta}` : delta}%
                          </span>
                        )}
                        {smallest != null && size === smallest && fresh && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                          >
                            <TrophyIcon className="size-2.5" aria-hidden />
                            {t('sia.try.smallest')}
                          </motion.span>
                        )}
                        {!fresh && <LoaderCircleIcon className="size-3 animate-spin text-muted-foreground motion-reduce:animate-none" aria-label={t('sia.try.converting')} />}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={cn('h-full origin-left rounded-full', result && !result.ok ? 'bg-destructive' : 'bg-primary/70')}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: result?.ok ? Math.max(0.02, size / largest) : 0, opacity: fresh ? 1 : 0.45 }}
                          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                        />
                      </div>
                      {result && !result.ok && <p className="mt-0.5 truncate text-[10px] text-destructive">{result.error}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={!result?.ok || !fresh}
                      aria-label={t('sia.try.download', { format: FORMAT_LABELS[format] })}
                      title={t('sia.try.download', { format: FORMAT_LABELS[format] })}
                      onClick={() => result?.ok && download(format, result.out)}
                    >
                      <DownloadIcon />
                    </Button>
                  </motion.li>
                )
              })}
            </ul>
            <p className="text-[11px] leading-4 text-muted-foreground">{t('sia.try.footnote')}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <PanelError message={error} />}
    </PanelSection>
  )
}
