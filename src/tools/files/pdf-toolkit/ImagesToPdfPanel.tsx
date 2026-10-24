import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { EyeIcon, ImageIcon, LoaderCircleIcon, SlidersHorizontalIcon } from 'lucide-react'

import { DEFAULT_IMAGE_PDF_OPTIONS, layoutImagesPdf, type ImagePdfOptions, type PdfImageSource } from '@/core/engines/files/pdfImages'
import { renderPdf } from '@/core/engines/files/pdfLayout'
import { PdfPageSvg, splitFileName } from '@/shared/components/files'
import { ActionBar, OptionField, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { imageToPdfSource } from '../file-toolkit/convert'
import { SourceFiles } from './SourceFiles'
import { pdfArtifact, usePdfSession } from './session'
import { useSourceFiles } from './useSourceFiles'
import { useTask } from './useTask'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif'

/** Photos and scans to PDF pages, with a live preview of page size, margins and fit. */
export function ImagesToPdfPanel() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { showResults } = usePdfSession()
  const { files, add, remove, move, clear } = useSourceFiles()
  const [sources, setSources] = useState<Record<string, PdfImageSource | 'error'>>({})
  const [options, setOptions] = useState<ImagePdfOptions>(DEFAULT_IMAGE_PDF_OPTIONS)
  const [merge, setMerge] = useState(true)
  const [compress, setCompress] = useState(false)
  const { busy, error, run } = useTask()

  const requested = useRef(new Set<string>())
  useEffect(() => {
    for (const entry of files) {
      if (requested.current.has(entry.id)) continue
      requested.current.add(entry.id)
      imageToPdfSource(entry.file).then(
        (source) => setSources((current) => ({ ...current, [entry.id]: source })),
        () => setSources((current) => ({ ...current, [entry.id]: 'error' })),
      )
    }
  }, [files])

  const ready = useMemo(
    () => files.map((entry) => sources[entry.id]).filter((source): source is PdfImageSource => !!source && source !== 'error'),
    [files, sources],
  )
  const preview = useMemo(() => layoutImagesPdf(ready.slice(0, 8), options), [ready, options])
  const loading = files.some((entry) => !sources[entry.id])
  const set = <K extends keyof ImagePdfOptions>(key: K, value: ImagePdfOptions[K]) => setOptions((current) => ({ ...current, [key]: value }))

  const convert = () =>
    run(async () => {
      const usable = files.filter((entry) => sources[entry.id] !== 'error')
      const prepared = await Promise.all(usable.map(async (entry) => ({ entry, source: compress ? await imageToPdfSource(entry.file, { compress: true }) : (sources[entry.id] as PdfImageSource) })))
      const groups = merge ? [prepared] : prepared.map((item) => [item])
      const artifacts = []
      for (const group of groups) {
        const stem = merge ? (group.length === 1 ? splitFileName(group[0].entry.file.name).stem : 'images') : splitFileName(group[0].entry.file.name).stem
        const layout = layoutImagesPdf(group.map((item) => item.source), options, stem)
        const bytes = new Uint8Array(await (await renderPdf(layout)).arrayBuffer())
        artifacts.push(pdfArtifact(`${stem}.pdf`, bytes, { note: merge ? t('pdf.images.note', { count: group.length }) : undefined }))
      }
      showResults({ artifacts, zipName: 'images-pdf.zip' })
    })

  const fitPage = options.pageSize === 'fit'
  return (
    <div className="flex flex-col gap-3">
      <SourceFiles
        files={files}
        onAdd={add}
        onRemove={remove}
        onMove={move}
        onClear={clear}
        accept={ACCEPT}
        title={t('pdf.images.drop')}
        hint={t('pdf.images.dropHint')}
        glyphs={['jpg', 'png', 'webp']}
        formats={['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'AVIF']}
        thumb={(entry) => {
          const source = sources[entry.id]
          if (!source) return <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" aria-hidden />
          if (source === 'error') return <ImageIcon className="size-4 text-destructive" aria-hidden />
          return <img src={source.src} alt="" className="size-full object-cover" />
        }}
        describe={(entry) => {
          const source = sources[entry.id]
          if (source === 'error') return <span className="text-destructive">{t('pdf.images.unreadable')}</span>
          return source ? <span>{source.width} × {source.height}</span> : null
        }}
      />

      {files.length > 0 && (
        <div className="grid items-start gap-3 @[820px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <PanelSection title={t('pdf.images.layout')} icon={<SlidersHorizontalIcon />}>
            <OptionField label={t('pdf.images.pageSize')}>
              <Segmented
                ariaLabel={t('pdf.images.pageSize')}
                value={options.pageSize}
                onValueChange={(value) => set('pageSize', value)}
                options={[
                  { value: 'a4', label: 'A4' },
                  { value: 'letter', label: t('pdf.images.letter') },
                  { value: 'fit', label: t('pdf.images.fitImage') },
                ]}
                className="self-start"
              />
            </OptionField>
            <OptionField label={t('pdf.images.orientation')}>
              <Segmented
                ariaLabel={t('pdf.images.orientation')}
                value={options.orientation}
                onValueChange={(value) => set('orientation', value)}
                options={(['auto', 'portrait', 'landscape'] as const).map((value) => ({ value, label: t(`pdf.images.${value}`), disabled: fitPage }))}
                className="self-start"
              />
            </OptionField>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              <OptionField label={t('pdf.images.margin')}>
                <Segmented
                  ariaLabel={t('pdf.images.margin')}
                  value={options.margin}
                  onValueChange={(value) => set('margin', value)}
                  options={(['none', 'small', 'normal'] as const).map((value) => ({ value, label: t(`pdf.images.margins.${value}`) }))}
                />
              </OptionField>
              <OptionField label={t('pdf.images.fit')}>
                <Segmented
                  ariaLabel={t('pdf.images.fit')}
                  value={options.fit}
                  onValueChange={(value) => set('fit', value)}
                  options={(['contain', 'cover'] as const).map((value) => ({ value, label: t(`pdf.images.fits.${value}`), disabled: fitPage }))}
                />
              </OptionField>
            </div>
            <OptionSwitch label={t('pdf.images.merge')} hint={t('pdf.images.mergeHint')} checked={merge} onChange={setMerge} />
            <OptionSwitch label={t('pdf.images.compress')} hint={t('pdf.images.compressHint')} checked={compress} onChange={setCompress} />
          </PanelSection>

          <PanelSection
            title={t('pdf.images.preview')}
            icon={<EyeIcon />}
            actions={loading ? <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" aria-hidden /> : null}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] items-end gap-3 rounded-xl bg-muted/40 p-3">
              {preview.pages.map((page, index) => (
                <motion.div
                  key={`${index}-${page.width}-${page.height}`}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="overflow-hidden rounded-md shadow-md ring-1 ring-black/5"
                >
                  <PdfPageSvg page={page} label={t('fileui.page', { index: index + 1, total: ready.length })} />
                </motion.div>
              ))}
            </div>
            {ready.length > 8 && <p className="text-center text-[11px] text-muted-foreground">{t('pdf.images.more', { count: ready.length - 8 })}</p>}
          </PanelSection>
        </div>
      )}

      {error && <PanelError message={error} />}
      {files.length > 0 && (
        <ActionBar>
          <Button onClick={() => void convert()} disabled={busy || loading || !ready.length} className="min-w-40 flex-1 @[480px]:flex-none">
            {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <ImageIcon aria-hidden />}
            {merge ? t('pdf.images.runMerged', { count: ready.length }) : t('pdf.images.runSeparate', { count: ready.length })}
          </Button>
        </ActionBar>
      )}
    </div>
  )
}
