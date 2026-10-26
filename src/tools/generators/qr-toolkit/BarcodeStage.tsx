import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BarcodeIcon, CheckIcon, CircleAlertIcon, DownloadIcon, ImageIcon } from 'lucide-react'

import { createBarcodeSvg, type BarcodeFormat } from '@/core/engines/barcode'
import { downloadDataUrl } from '@/core/engines/capture'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { svgToPngBlob, type BarcodeStyle } from './barcodeModel'

interface BarcodeStageProps {
  format: BarcodeFormat
  value: string
  style: BarcodeStyle
  fileStem: string
}

export function BarcodeStage({ format, value, style, fileStem }: BarcodeStageProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [done, setDone] = useState<'png' | 'copy' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const rendered = useMemo(() => createBarcodeSvg(format, value, style), [format, value, style])
  const live = rendered.ok

  const flash = (kind: 'png' | 'copy') => {
    setDone(kind)
    setExportError(null)
    window.setTimeout(() => setDone((current) => (current === kind ? null : current)), 1600)
  }

  const exportPng = async (copy: boolean) => {
    if (!rendered.ok) return
    try {
      const blob = await svgToPngBlob(rendered.value.svg, rendered.value.width, rendered.value.height)
      if (copy) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      } else {
        const url = URL.createObjectURL(blob)
        downloadDataUrl(url, `${fileStem}.png`)
        window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
      flash(copy ? 'copy' : 'png')
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <section aria-label={t('qrk.barcode.previewTitle')} className="relative overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative flex flex-col items-center gap-3 px-4 pt-5 pb-4">
        <div className="relative w-full max-w-full overflow-hidden rounded-xl border bg-background/80 p-4 shadow-inner">
          <AnimatePresence mode="wait" initial={false}>
            {live ? (
              <motion.div
                key={rendered.value.payload}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full justify-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: rendered.value.svg }}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 text-center"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {rendered.ok ? (
                    <BarcodeIcon className="size-5" aria-hidden />
                  ) : (
                    <CircleAlertIcon className="size-5 text-destructive" aria-hidden />
                  )}
                </span>
                <p className="text-[13px] font-medium">{t('qrk.barcode.emptyTitle')}</p>
                <p className="max-w-[16rem] text-xs text-muted-foreground">
                  {!rendered.ok ? rendered.error : t('qrk.barcode.emptyHint')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {live && !reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-4 left-0 w-1/4 bg-gradient-to-r from-primary/10 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '420%' }}
              transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.2 }}
            />
          )}
        </div>
        {live && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {t('qrk.barcode.summary', { format: t(`qrk.barcode.format.${format}`), width: Math.round(rendered.value.width) })}
          </p>
        )}
        {exportError && <p className="text-xs text-destructive">{exportError}</p>}
      </div>

      <div className="relative flex flex-wrap items-center gap-2 border-t bg-muted/30 px-3 py-2.5">
        <Button size="xs" disabled={!live} onClick={() => void exportPng(false)}>
          {done === 'png' ? <CheckIcon className="size-3.5" aria-hidden /> : <DownloadIcon className="size-3.5" aria-hidden />}
          PNG
        </Button>
        <Button size="xs" variant="outline" disabled={!live} onClick={() => void exportPng(true)}>
          {done === 'copy' ? <CheckIcon className="size-3.5" aria-hidden /> : <ImageIcon className="size-3.5" aria-hidden />}
          {done === 'copy' ? t('common.copied') : t('qrk.copyImageShort')}
        </Button>
        <span className={cn(!live && 'pointer-events-none opacity-50')}>
          <CopyButton text={live ? rendered.value.payload : ''} label={t('qrk.barcode.copyValue')} />
        </span>
      </div>
    </section>
  )
}
