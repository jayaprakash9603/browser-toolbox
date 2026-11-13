import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  BarcodeIcon,
  ClipboardPasteIcon,
  ExternalLinkIcon,
  ImageUpIcon,
  MonitorIcon,
  PencilLineIcon,
  RotateCcwIcon,
  ScanLineIcon,
  SearchXIcon,
} from 'lucide-react'

import { parseBarcodeContent } from '@/core/engines/barcode/parse'
import type { BarcodeFormat } from '@/core/engines/barcode'
import { decodeCodesFromImage, type DecodedCode } from '@/core/engines/codes/decode'
import {
  parseQrContent,
  type ParsedQrContent,
} from '@/core/engines/qrcode'
import { ensureClipboardReadPermission } from '@/core/clipboard/clipboardService'
import { captureVisibleTab } from '@/core/engines/capture'
import { fileToDataUrl, loadImageFromDataUrl } from '@/core/engines/image'
import { CopyButton } from '@/shared/components/CopyButton'
import { SectionCard, ValueCard, ValueGrid } from '@/shared/components/ValueCard'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { PRESET_ICONS } from './presetIcons'

const MAX_SCAN_EDGE = 2048
const MIN_SCAN_MS = 550

type Phase = 'idle' | 'scanning' | 'found' | 'missing'

interface Scan {
  src: string
  width: number
  height: number
  codes: DecodedCode[]
  error: string | null
}

async function scanDataUrl(src: string): Promise<Scan> {
  const img = await loadImageFromDataUrl(src)
  const scale = Math.min(1, MAX_SCAN_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const base = { src, width: img.naturalWidth, height: img.naturalHeight, codes: [] as DecodedCode[] }
  if (!ctx) return { ...base, error: 'Canvas unavailable.' }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const codes = await decodeCodesFromImage({
    data: pixels.data,
    width: canvas.width,
    height: canvas.height,
    canvas,
    scale,
  })
  return { ...base, codes, error: null }
}

function openLink(url: string) {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) void chrome.tabs.create({ url })
  else window.open(url, '_blank', 'noopener,noreferrer')
}

export function DecodePanel({
  onEditQr,
  onEditBarcode,
}: {
  onEditQr: (parsed: ParsedQrContent) => void
  onEditBarcode: (format: BarcodeFormat, value: string) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [scan, setScan] = useState<Scan | null>(null)
  const [dragging, setDragging] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)

  const start = useCallback(async (load: () => Promise<string | null>) => {
    setSourceError(null)
    let src: string | null
    try {
      src = await load()
    } catch (cause) {
      setSourceError(cause instanceof Error ? cause.message : String(cause))
      return
    }
    if (!src) return
    setScan({ src, width: 1, height: 1, codes: [], error: null })
    setPhase('scanning')
    const started = performance.now()
    const outcome = await scanDataUrl(src).catch(
      (cause: unknown): Scan => ({ src, width: 1, height: 1, codes: [], error: String(cause) }),
    )
    const wait = MIN_SCAN_MS - (performance.now() - started)
    if (wait > 0 && !reduce) await new Promise((resolve) => setTimeout(resolve, wait))
    setScan(outcome)
    setPhase(outcome.codes.length > 0 ? 'found' : 'missing')
  }, [reduce])

  const fromFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || !file.type.startsWith('image/')) return
      void start(() => fileToDataUrl(file))
    },
    [start],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
      if (file) {
        event.preventDefault()
        fromFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [fromFile])

  const pasteFromClipboard = () =>
    start(async () => {
      await ensureClipboardReadPermission()
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((ty) => ty.startsWith('image/'))
        if (type) return fileToDataUrl(new File([await item.getType(type)], 'clipboard', { type }))
      }
      throw new Error(t('qrk.clipboardEmpty'))
    })

  const scanTab = () =>
    start(async () => {
      const shot = await captureVisibleTab()
      if (!shot.ok) throw new Error(shot.error)
      return shot.value.dataUrl
    })

  const reset = () => {
    setPhase('idle')
    setScan(null)
    setSourceError(null)
  }

  const foundLabel = (() => {
    if (!scan || scan.codes.length === 0) return ''
    if (scan.codes.length === 1) {
      const code = scan.codes[0]
      return code.family === 'qr' ? t('qrk.foundQr') : t('qrk.foundBarcode', { format: parseBarcodeContent(code.format, code.data).label })
    }
    return t('qrk.foundMany', { count: scan.codes.length })
  })()

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          fromFile(e.dataTransfer.files[0])
        }}
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-card shadow-xs transition-[border-color,box-shadow] duration-200',
          dragging && 'border-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
        />
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'idle' || !scan ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="relative flex flex-col items-center gap-4 px-4 py-7 text-center"
            >
              <Viewfinder active={dragging} />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">{dragging ? t('qrk.dropNow') : t('qrk.decodeTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('qrk.decodeHint')}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <label className="cursor-pointer">
                    <ImageUpIcon aria-hidden />
                    {t('qrk.chooseImage')}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        fromFile(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                </Button>
                <Button size="sm" variant="outline" onClick={() => void pasteFromClipboard()}>
                  <ClipboardPasteIcon aria-hidden />
                  {t('qrk.paste')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void scanTab()}>
                  <MonitorIcon aria-hidden />
                  {t('qrk.scanTab')}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={scan.src}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="relative flex flex-col items-center gap-3 p-4"
            >
              <ScanImage scan={scan} phase={phase} />
              <p role="status" className="text-xs text-muted-foreground">
                {phase === 'scanning' ? t('qrk.scanning') : phase === 'found' ? foundLabel : t('qrk.notFound')}
              </p>
              <Button size="xs" variant="ghost" onClick={reset} disabled={phase === 'scanning'}>
                <RotateCcwIcon aria-hidden />
                {t('qrk.scanAnother')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {sourceError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {sourceError}
        </p>
      )}

      <AnimatePresence initial={false}>
        {phase === 'missing' && (
          <motion.div key="missing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-start gap-3 rounded-xl border border-dashed px-3 py-3 text-[13px]">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <SearchXIcon className="size-4 text-muted-foreground" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{t('qrk.notFoundTitle')}</span>
                <span className="text-xs text-muted-foreground">{t('qrk.notFoundHint')}</span>
              </div>
            </div>
          </motion.div>
        )}
        {phase === 'found' && scan?.codes.map((code, index) => (
          <motion.div
            key={`${scan.src}-${code.format}-${index}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.2 + index * 0.08 }}
          >
            <ResultCard
              code={code}
              onEditQr={onEditQr}
              onEditBarcode={onEditBarcode}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function ResultCard({
  code,
  onEditQr,
  onEditBarcode,
}: {
  code: DecodedCode
  onEditQr: (parsed: ParsedQrContent) => void
  onEditBarcode: (format: BarcodeFormat, value: string) => void
}) {
  const { t } = useTranslation()
  const qrParsed = parseQrContent(code.data)
  const barcodeParsed = code.family === 'barcode' ? parseBarcodeContent(code.format, code.data) : null
  const Icon = code.family === 'qr' ? PRESET_ICONS[qrParsed.kind] : BarcodeIcon
  const title =
    code.family === 'qr'
      ? t('qrk.detectedQr', { kind: t(`qr.preset.${qrParsed.kind}`) })
      : t('qrk.detectedBarcode', { format: barcodeParsed?.label ?? t('qrk.family.barcode') })
  const display = (key: string, value: string) => {
    if (key === 'hidden') return t('qrk.yes')
    if (key === 'encryption') return value === 'nopass' ? t('qrk.openNetwork') : value
    if (key === 'checkOk') return value === 'valid' ? t('qrk.checkValid') : t('qrk.checkInvalid')
    return value
  }
  const fields =
    code.family === 'qr'
      ? qrParsed.kind === 'text' || qrParsed.kind === 'url'
        ? []
        : qrParsed.fields
      : [
          ...(barcodeParsed?.fields.filter((field) => field.key !== 'value') ?? []),
          ...(qrParsed.kind !== 'text' ? qrParsed.fields : []),
        ]
  const link = qrParsed.kind === 'url' ? code.data.trim() : null
  const barcodeFormat = barcodeParsed?.generatorFormat
  return (
    <SectionCard
      icon={Icon}
      title={title}
      description={t('qrk.chars', { count: code.data.length })}
      actions={<CopyButton text={code.data} size="xs" label={t('qrk.copyAll')} />}
      bodyClassName="flex flex-col gap-3"
    >
      {fields.length > 0 && (
        <ValueGrid>
          {fields.map((field) => (
            <ValueCard
              key={field.key}
              label={t(`qrk.field.${field.key}`)}
              value={display(field.key, field.value)}
              copyText={field.key === 'hidden' || field.key === 'checkOk' ? '' : field.value}
            />
          ))}
        </ValueGrid>
      )}
      <div className="max-h-40 overflow-auto rounded-lg bg-muted/50 px-3 py-2">
        <code className="font-mono text-[12px] break-all whitespace-pre-wrap">{code.data}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        {link && /^https?:\/\//i.test(link) && (
          <Button size="sm" onClick={() => openLink(link)}>
            <ExternalLinkIcon aria-hidden />
            {t('qrk.openLink')}
          </Button>
        )}
        {code.family === 'qr' && (
          <Button size="sm" variant="outline" onClick={() => onEditQr(qrParsed)}>
            <PencilLineIcon aria-hidden />
            {t('qrk.editInGenerator')}
          </Button>
        )}
        {barcodeFormat && (
          <Button size="sm" variant="outline" onClick={() => onEditBarcode(barcodeFormat, code.data)}>
            <BarcodeIcon aria-hidden />
            {t('qrk.editInBarcode')}
          </Button>
        )}
      </div>
    </SectionCard>
  )
}

function ScanImage({ scan, phase }: { scan: Scan; phase: Phase }) {
  const reduce = useReducedMotion()
  const stroke = Math.max(scan.width, scan.height) / 160
  return (
    <div className="relative w-full max-w-[18rem] overflow-hidden rounded-xl border bg-muted/40">
      <img src={scan.src} alt="" className="block max-h-72 w-full object-contain" />
      {phase === 'scanning' && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/4"
          initial={{ y: '-100%' }}
          animate={{ y: '400%' }}
          transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
        >
          <div className="h-full bg-gradient-to-b from-transparent to-primary/30" />
          <div className="h-0.5 bg-primary shadow-[0_0_14px_3px_var(--primary)]" />
        </motion.div>
      )}
      {phase === 'missing' && (
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-destructive/10"
          initial={{ opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.5 }}
        />
      )}
      {phase === 'found' && scan.codes.some((code) => code.corners.length >= 3) && (
        <svg
          aria-hidden
          viewBox={`0 0 ${scan.width} ${scan.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {scan.codes.map((code, codeIndex) => {
            if (code.corners.length < 3) return null
            const points = code.corners.map((p) => `${p.x},${p.y}`).join(' ')
            const color = code.family === 'qr' ? 'var(--primary)' : 'oklch(0.75 0.15 75)'
            return (
              <g key={`${code.format}-${codeIndex}`}>
                <motion.polygon
                  points={points}
                  fill={`color-mix(in oklab, ${color} 18%, transparent)`}
                  stroke={color}
                  strokeWidth={stroke}
                  strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0, fillOpacity: 0 }}
                  animate={{ pathLength: 1, fillOpacity: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: codeIndex * 0.08 }}
                />
                {code.corners.map((p, index) => (
                  <motion.circle
                    key={index}
                    cx={p.x}
                    cy={p.y}
                    r={stroke * 2.2}
                    fill={color}
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.3 + index * 0.07 }}
                  />
                ))}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

const VIEWFINDER_CORNERS = [
  'top-0 left-0 rounded-tl-2xl border-t-[3px] border-l-[3px]',
  'top-0 right-0 rounded-tr-2xl border-t-[3px] border-r-[3px]',
  'bottom-0 right-0 rounded-br-2xl border-b-[3px] border-r-[3px]',
  'bottom-0 left-0 rounded-bl-2xl border-b-[3px] border-l-[3px]',
]

function Viewfinder({ active }: { active: boolean }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      aria-hidden
      className="relative flex size-28 items-center justify-center"
      animate={reduce ? undefined : { scale: active ? 0.9 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {VIEWFINDER_CORNERS.map((corner, index) => (
        <motion.span
          key={corner}
          className={cn('absolute size-8 transition-colors duration-200', active ? 'border-primary' : 'border-primary/60', corner)}
          initial={reduce ? false : { opacity: 0, scale: 1.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: index * 0.06 }}
        />
      ))}
      <motion.span
        className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
        initial={reduce ? false : { scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.25 }}
      >
        <ScanLineIcon className="size-7" />
      </motion.span>
    </motion.div>
  )
}
