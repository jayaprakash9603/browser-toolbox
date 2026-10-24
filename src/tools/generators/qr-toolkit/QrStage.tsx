import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  FileCodeIcon,
  ImageIcon,
  QrCodeIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import { QR_BYTE_CAPACITY, type QrMatrix } from '@/core/engines/qrcode'
import { downloadDataUrl } from '@/core/engines/capture'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

import { QrArt } from './QrArt'
import {
  buildQrGeometry,
  buildQrSvg,
  scanRisk,
  svgToPngBlob,
  type QrStyle,
} from './qrModel'

const EXPORT_SIZES = ['512', '1024', '2048'] as const
type ExportSize = (typeof EXPORT_SIZES)[number]

const GHOST: QrMatrix = (() => {
  const size = 25
  const data = new Uint8Array(size * size)
  let seed = 20261024
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    data[i] = (seed >> 16) % 100 < 46 ? 1 : 0
  }
  return { size, version: 2, data }
})()

interface QrStageProps {
  payload: string
  matrix: QrMatrix | null
  error: string | null
  style: QrStyle
  logo: string | null
  revealKey: number
  fileStem: string
  onUseHighCorrection: () => void
}

export function QrStage({
  payload,
  matrix,
  error,
  style,
  logo,
  revealKey,
  fileStem,
  onUseHighCorrection,
}: QrStageProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [exportSize, setExportSize] = useState<ExportSize>('1024')
  const [done, setDone] = useState<'png' | 'svg' | 'copy' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const geometry = useMemo(
    () => (matrix ? buildQrGeometry(matrix, style, Boolean(logo)) : null),
    [matrix, style, logo],
  )
  const ghost = useMemo(
    () => buildQrGeometry(GHOST, { ...style, showLabel: false, margin: 1 }, false),
    [style],
  )

  const bytes = useMemo(() => new TextEncoder().encode(payload).length, [payload])
  const capacity = Math.min(1, bytes / QR_BYTE_CAPACITY[style.ecl])
  const risk = scanRisk(style)
  const live = Boolean(geometry && payload)

  const flash = (kind: 'png' | 'svg' | 'copy') => {
    setDone(kind)
    setExportError(null)
    window.setTimeout(() => setDone((current) => (current === kind ? null : current)), 1600)
  }

  const svgMarkup = () => (geometry ? buildQrSvg(geometry, style, logo) : '')

  const pngBlob = async () => {
    if (!geometry) throw new Error('Nothing to export.')
    const width = Number(exportSize)
    return svgToPngBlob(svgMarkup(), width, (width * geometry.height) / geometry.width)
  }

  const run = async (kind: 'png' | 'svg' | 'copy') => {
    try {
      if (kind === 'svg') {
        const url = URL.createObjectURL(new Blob([svgMarkup()], { type: 'image/svg+xml' }))
        downloadDataUrl(url, `${fileStem}.svg`)
        window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      } else {
        const blob = await pngBlob()
        if (kind === 'copy') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        } else {
          const url = URL.createObjectURL(blob)
          downloadDataUrl(url, `${fileStem}.png`)
          window.setTimeout(() => URL.revokeObjectURL(url), 2000)
        }
      }
      flash(kind)
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const glow =
    style.gradient === 'none'
      ? `radial-gradient(circle, ${style.eyeColor ?? style.fg} 0%, transparent 68%)`
      : `radial-gradient(circle, ${style.fg} 0%, ${style.fg2} 38%, transparent 70%)`

  return (
    <section
      aria-label={t('qrk.previewTitle')}
      className="relative overflow-hidden rounded-2xl border bg-card shadow-xs"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-6">
        <motion.div
          key={live ? `glow-${revealKey}` : 'glow-idle'}
          className="size-64 rounded-full blur-3xl"
          style={{ background: glow }}
          initial={reduce ? false : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: live ? 0.32 : 0.08, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-3 px-4 pt-5 pb-4">
        <div className="relative w-full max-w-[16.5rem] p-3">
          <Brackets lockKey={live ? revealKey : -1} live={live} />
          <AnimatePresence mode="popLayout" initial={false}>
            {live && geometry ? (
              <motion.div
                key="code"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotateX: 18 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                style={{ transformPerspective: 800 }}
                className={cn(
                  'relative overflow-hidden rounded-xl shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)] ring-1 ring-black/5',
                  style.transparent &&
                    'bg-[conic-gradient(#e5e7eb_25%,#ffffff_0_50%,#e5e7eb_0_75%,#ffffff_0)] [background-size:12px_12px]',
                )}
              >
                <QrArt
                  geometry={geometry}
                  style={style}
                  logo={logo}
                  revealKey={revealKey}
                  label={t('qr.preview')}
                  className="block h-auto w-full"
                />
                {!reduce && <ScanSweep key={revealKey} />}
              </motion.div>
            ) : (
              <motion.div
                key="ghost"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="relative flex aspect-square items-center justify-center rounded-xl border border-dashed bg-background/60"
              >
                <QrArt
                  geometry={ghost}
                  style={{ ...style, fg: 'currentColor', gradient: 'none', eyeColor: null, transparent: true }}
                  logo={null}
                  revealKey={0}
                  className="absolute inset-4 text-foreground/[0.07]"
                />
                <div className="relative flex max-w-[12rem] flex-col items-center gap-2 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {error ? <CircleAlertIcon className="size-5" aria-hidden /> : <QrCodeIcon className="size-5" aria-hidden />}
                  </span>
                  <p className="text-[13px] font-medium">{error ? t('qrk.tooLong') : t('qrk.emptyTitle')}</p>
                  <p className="text-xs text-muted-foreground">{error ? error : t('qrk.emptyHint')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p role="status" className="min-h-4 text-xs text-muted-foreground tabular-nums">
          {live && matrix
            ? t('qrk.summary', { version: matrix.version, size: matrix.size, bytes, count: bytes })
            : ''}
        </p>

        <AnimatePresence initial={false}>
          {live && matrix && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
              className="flex w-full flex-col gap-2"
            >
              <div className="grid grid-cols-3 gap-1.5">
                <Stat label={t('qrk.version')} value={matrix.version} />
                <Stat label={t('qrk.modules')} value={`${matrix.size}²`} />
                <Stat label={t('qrk.correction')} value={t(`qrk.ecl.${style.ecl}`)} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('qrk.capacity')}</span>
                  <span className="tabular-nums">{Math.max(1, Math.round(capacity * 100))}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={cn(
                      'h-full origin-left rounded-full',
                      capacity > 0.8 ? 'bg-amber-500' : 'bg-gradient-to-r from-primary/70 to-primary',
                    )}
                    initial={false}
                    animate={{ scaleX: Math.max(0.02, capacity) }}
                    transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {live && risk !== 'ok' && (
            <Notice key={`risk-${risk}`} icon={TriangleAlertIcon}>
              {t(risk === 'inverted' ? 'qrk.riskInverted' : 'qrk.riskContrast')}
            </Notice>
          )}
          {live && logo && style.ecl !== 'H' && (
            <Notice key="logo-ecl" icon={TriangleAlertIcon}>
              <span className="flex-1">{t('qrk.logoNeedsH')}</span>
              <Button size="xs" variant="outline" onClick={onUseHighCorrection}>
                {t('qrk.useH')}
              </Button>
            </Notice>
          )}
          {exportError && (
            <Notice key="export-error" icon={CircleAlertIcon} tone="error">
              {exportError}
            </Notice>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex flex-wrap items-center gap-2 border-t bg-muted/30 px-3 py-2.5">
        <Segmented
          size="sm"
          ariaLabel={t('qrk.exportSize')}
          value={exportSize}
          onValueChange={setExportSize}
          options={EXPORT_SIZES.map((size) => ({ value: size, label: `${size}px` }))}
        />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button size="xs" disabled={!live} onClick={() => void run('png')}>
            <SwapIcon done={done === 'png'} icon={DownloadIcon} />
            PNG
          </Button>
          <Button size="xs" variant="outline" disabled={!live} onClick={() => void run('svg')}>
            <SwapIcon done={done === 'svg'} icon={FileCodeIcon} />
            SVG
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={!live}
            onClick={() => void run('copy')}
            aria-label={t('qrk.copyImage')}
          >
            <SwapIcon done={done === 'copy'} icon={ImageIcon} />
            {done === 'copy' ? t('common.copied') : t('qrk.copyImageShort')}
          </Button>
          <CopyButton text={live ? payload : ''} label={t('qrk.copyContent')} />
        </div>
      </div>
    </section>
  )
}

function SwapIcon({ done, icon: Icon }: { done: boolean; icon: typeof DownloadIcon }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={done ? 'done' : 'idle'}
        className="inline-flex"
        initial={{ scale: 0.4, opacity: 0, rotate: done ? -45 : 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.4, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      >
        {done ? <CheckIcon aria-hidden /> : <Icon aria-hidden />}
      </motion.span>
    </AnimatePresence>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-muted/60 px-2.5 py-1.5">
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      <span className="truncate text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function Notice({
  icon: Icon,
  children,
  tone = 'warn',
}: {
  icon: typeof DownloadIcon
  children: ReactNode
  tone?: 'warn' | 'error'
}) {
  return (
    <motion.div
      role={tone === 'error' ? 'alert' : undefined}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className="w-full"
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs',
          tone === 'error'
            ? 'border-destructive/30 bg-destructive/5 text-destructive'
            : 'border-amber-500/30 bg-amber-500/[0.07] text-amber-700 dark:text-amber-400',
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {children}
      </div>
    </motion.div>
  )
}

const CORNERS = [
  { className: 'top-0 left-0 rounded-tl-xl border-t-2 border-l-2', x: -8, y: -8 },
  { className: 'top-0 right-0 rounded-tr-xl border-t-2 border-r-2', x: 8, y: -8 },
  { className: 'bottom-0 right-0 rounded-br-xl border-b-2 border-r-2', x: 8, y: 8 },
  { className: 'bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2', x: -8, y: 8 },
]

/** Viewfinder corners that snap onto the code each time it is regenerated. */
function Brackets({ lockKey, live }: { lockKey: number; live: boolean }) {
  const reduce = useReducedMotion()
  return (
    <>
      {CORNERS.map((corner, index) => (
        <motion.span
          key={`${lockKey}-${index}`}
          aria-hidden
          className={cn(
            'pointer-events-none absolute size-6 transition-colors duration-300',
            live ? 'border-primary' : 'border-muted-foreground/30',
            corner.className,
          )}
          initial={reduce ? false : { x: corner.x * 1.5, y: corner.y * 1.5, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20, delay: live ? 0.05 * index : 0 }}
        />
      ))}
    </>
  )
}

function ScanSweep() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-1/5"
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ y: '520%', opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.1, ease: [0.45, 0, 0.25, 1], delay: 0.1 }}
    >
      <div className="h-full bg-gradient-to-b from-transparent to-primary/25" />
      <div className="h-0.5 bg-primary shadow-[0_0_12px_2px_var(--primary)]" />
    </motion.div>
  )
}
