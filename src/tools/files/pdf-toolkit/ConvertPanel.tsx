import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { FileImageIcon, LoaderCircleIcon, Settings2Icon } from 'lucide-react'

import { DEFAULT_DOCUMENT_SETTINGS, type DocBlock, type DocumentSettings } from '@/core/engines/files/document'
import { docToDocx } from '@/core/engines/files/docx'
import { canvasToBlob, extractPageImages, extractPageText, renderPdfPageBlob } from '@/core/engines/pdf/pdfjs'
import { bytesBlob, createArtifact, type FileArtifact } from '@/shared/components/files'
import { ActionBar, OptionField, OptionSelect, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Slider } from '@/shared/components/ui/slider'
import { optionalSelection, rangeIssueMessage } from './rangeText'
import { stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Target = 'images' | 'text' | 'word'

const DPIS = ['72', '150', '220', '300'] as const

function toBlocks(pages: string[], headings: boolean): DocBlock[] {
  const blocks: DocBlock[] = []
  pages.forEach((text, index) => {
    if (headings) blocks.push({ type: 'heading', level: 2, runs: [{ text: `Page ${index + 1}` }] })
    for (const paragraph of text.split(/\n{2,}/)) {
      const joined = paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/(\w)- (\w)/g, '$1$2')
      if (joined) blocks.push({ type: 'paragraph', runs: [{ text: joined }] })
    }
  })
  return blocks
}

export function ConvertPanel({ target }: { target: Target }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [imageMode, setImageMode] = useState<'pages' | 'extract'>('pages')
  const [format, setFormat] = useState<'png' | 'jpg'>('jpg')
  const [dpi, setDpi] = useState<(typeof DPIS)[number]>('150')
  const [quality, setQuality] = useState(85)
  const [range, setRange] = useState('')
  const [separators, setSeparators] = useState(true)
  const [headings, setHeadings] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const { busy, error, run } = useTask()

  const selection = optionalSelection(range, total)
  const pages = selection.ok ? selection.pages : []
  const stem = stemOf(doc)

  const readTexts = async () => {
    const texts: string[] = []
    for (const [position, page] of pages.entries()) {
      texts.push(await extractPageText(doc.handle, page + 1))
      setProgress({ done: position + 1, total: pages.length })
    }
    return texts
  }

  const convert = () =>
    run(async () => {
      setProgress({ done: 0, total: pages.length })
      const artifacts: FileArtifact[] = []
      if (target === 'images' && imageMode === 'extract') {
        const seen = new Set<string>()
        const type = format === 'png' ? 'image/png' : 'image/jpeg'
        for (const [position, page] of pages.entries()) {
          const canvases = await extractPageImages(doc.handle, page + 1, seen)
          for (const [index, canvas] of canvases.entries()) {
            const blob = await canvasToBlob(canvas, type, quality / 100)
            artifacts.push(
              createArtifact({
                name: `${stem}-p${page + 1}-image-${index + 1}.${format}`,
                blob,
                format: format.toUpperCase(),
                preview: { kind: 'image', width: canvas.width, height: canvas.height },
              }),
            )
            canvas.width = 0
          }
          setProgress({ done: position + 1, total: pages.length })
        }
        if (!artifacts.length) throw new Error(t('pdf.convert.noImages'))
      } else if (target === 'images') {
        const type = format === 'png' ? 'image/png' : 'image/jpeg'
        for (const [position, page] of pages.entries()) {
          const blob = await renderPdfPageBlob(doc.handle, page + 1, { scale: Number(dpi) / 72, type, quality: quality / 100 })
          const info = doc.pages[page]
          const width = Math.round((info.width * Number(dpi)) / 72)
          const height = Math.round((info.height * Number(dpi)) / 72)
          artifacts.push(
            createArtifact({ name: `${stem}-page-${page + 1}.${format}`, blob, format: format.toUpperCase(), preview: { kind: 'image', width, height } }),
          )
          setProgress({ done: position + 1, total: pages.length })
        }
      } else {
        const texts = await readTexts()
        const empty = texts.every((text) => !text.trim())
        const note = empty ? t('pdf.convert.noText') : undefined
        if (target === 'text') {
          const text = texts
            .map((value, index) => (separators ? `--- ${t('pdf.convert.pageMarker', { page: pages[index] + 1 })} ---\n\n${value}` : value))
            .join('\n\n')
          artifacts.push(
            createArtifact({ name: `${stem}.txt`, blob: new Blob([text], { type: 'text/plain' }), format: 'TXT', preview: { kind: 'text', text, language: 'text' }, note }),
          )
        } else {
          const first = doc.pages[0]
          const settings: DocumentSettings = {
            ...DEFAULT_DOCUMENT_SETTINGS,
            title: '',
            markdown: false,
            pageNumbers: false,
            pageSize: first && Math.abs(first.width - 612) < 3 ? 'letter' : 'a4',
            orientation: first && first.width > first.height ? 'landscape' : 'portrait',
          }
          const blocks = toBlocks(texts, headings)
          artifacts.push(
            createArtifact({
              name: `${stem}.docx`,
              blob: bytesBlob(docToDocx(blocks, settings), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
              format: 'DOCX',
              preview: { kind: 'document', blocks, settings },
              note: note ?? t('pdf.convert.wordNote'),
            }),
          )
        }
      }
      showResults({ artifacts, zipName: `${stem}-${target === 'images' ? 'images' : 'text'}.zip` })
    }).finally(() => setProgress(null))

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.convert.options')} icon={<Settings2Icon />}>
        <motion.div key={imageMode} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
          {target === 'images' && (
            <Segmented
              ariaLabel={t('pdf.convert.imageMode')}
              value={imageMode}
              onValueChange={setImageMode}
              options={[
                { value: 'pages', label: t('pdf.convert.modePages') },
                { value: 'extract', label: t('pdf.convert.modeExtract') },
              ]}
              className="w-full max-w-md [&>button]:flex-1"
            />
          )}
          {target === 'images' && (
            <p className="text-[11px] text-muted-foreground">{imageMode === 'pages' ? t('pdf.convert.modePagesHint') : t('pdf.convert.modeExtractHint')}</p>
          )}
          {target === 'images' && (
            <div className="grid gap-3 @[560px]:grid-cols-3">
              <OptionField label={t('pdf.convert.format')}>
                <Segmented
                  size="sm"
                  ariaLabel={t('pdf.convert.format')}
                  value={format}
                  onValueChange={setFormat}
                  options={[
                    { value: 'png', label: 'PNG' },
                    { value: 'jpg', label: 'JPEG' },
                  ]}
                  className="h-8 w-full [&>button]:flex-1"
                />
              </OptionField>
              <OptionSelect
                label={t('pdf.convert.resolution')}
                value={dpi}
                onChange={setDpi}
                disabled={imageMode === 'extract'}
                options={DPIS.map((value) => ({ value, label: t(`pdf.convert.dpi${value}`) }))}
              />
              <OptionField label={t('pdf.convert.quality', { value: quality })}>
                <Slider
                  value={[quality]}
                  min={40}
                  max={100}
                  step={5}
                  disabled={format === 'png'}
                  thumbLabel={t('pdf.convert.qualityLabel')}
                  onValueChange={([value]) => setQuality(value)}
                  className="h-8"
                />
              </OptionField>
            </div>
          )}
          {target === 'text' && <OptionSwitch label={t('pdf.convert.separators')} hint={t('pdf.convert.separatorsHint')} checked={separators} onChange={setSeparators} />}
          {target === 'word' && (
            <>
              <OptionSwitch label={t('pdf.convert.headings')} hint={t('pdf.convert.headingsHint')} checked={headings} onChange={setHeadings} />
              <p className="text-[11px] text-muted-foreground">{t('pdf.convert.wordHint')}</p>
            </>
          )}
          <OptionField label={t('pdf.convert.pagesLabel')}>
            <Input
              value={range}
              onChange={(event) => setRange(event.target.value)}
              placeholder={t('pdf.allPages', { count: total })}
              aria-invalid={!selection.ok || undefined}
              className="h-8 max-w-xs font-mono text-xs"
            />
            {!selection.ok && <span className="text-[11px] text-destructive">{rangeIssueMessage(t, selection.issue)}</span>}
          </OptionField>
        </motion.div>
      </PanelSection>

      {error && <PanelError message={error} />}

      <ActionBar progress={progress ? progress.done / Math.max(1, progress.total) : null}>
        <Button onClick={() => void convert()} disabled={busy || !selection.ok || !pages.length} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <FileImageIcon aria-hidden />}
          {progress
            ? t('pdf.convert.progress', { done: progress.done, total: progress.total })
            : t(`pdf.convert.run.${target === 'images' && imageMode === 'extract' ? 'extract' : target}`, { count: pages.length })}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">
          {t('pdf.convert.pageCount', { count: pages.length })}
        </span>
      </ActionBar>
    </div>
  )
}
