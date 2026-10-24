import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileTextIcon, LoaderCircleIcon, PresentationIcon, SheetIcon, SlidersHorizontalIcon, type LucideIcon } from 'lucide-react'

import { DEFAULT_DOCUMENT_SETTINGS, type DocumentSettings, type MarginPreset, type PageSize } from '@/core/engines/files/document'
import { readDocx, readPptx, readXlsx } from '@/core/engines/files/office'
import { renderPdf, type PdfLayout } from '@/core/engines/files/pdfLayout'
import { layoutTablePdf } from '@/core/engines/files/pdfTable'
import { layoutTextDocument } from '@/core/engines/files/pdfText'
import { renderPresentation } from '@/core/engines/pdf/slidesPdf'
import { splitFileName, type FileArtifact } from '@/shared/components/files'
import { ActionBar, OptionField, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { DocumentSettingsForm } from '../file-toolkit/controls'
import { SourceFiles } from './SourceFiles'
import { pdfArtifact, usePdfSession } from './session'
import { useSourceFiles } from './useSourceFiles'
import { useTask } from './useTask'

type Kind = 'word' | 'powerpoint' | 'excel'

const META: Record<Kind, { accept: string; glyphs: [string, string, string]; formats: string[]; icon: LucideIcon }> = {
  word: { accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', glyphs: ['docx', 'docx', 'docx'], formats: ['DOCX'], icon: FileTextIcon },
  powerpoint: { accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', glyphs: ['pptx', 'pptx', 'pptx'], formats: ['PPTX'], icon: PresentationIcon },
  excel: { accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', glyphs: ['xlsx', 'xlsx', 'xlsx'], formats: ['XLSX'], icon: SheetIcon },
}

const toBytes = async (file: File) => new Uint8Array(await file.arrayBuffer())
const layoutBytes = async (layout: PdfLayout) => new Uint8Array(await (await renderPdf(layout)).arrayBuffer())

/** Word, PowerPoint and Excel files read in the browser and laid out as PDF. */
export function OfficeToPdfPanel({ kind }: { kind: Kind }) {
  const { t } = useTranslation()
  const { showResults } = usePdfSession()
  const { files, add, remove, move, clear } = useSourceFiles()
  const [settings, setSettings] = useState<DocumentSettings>({ ...DEFAULT_DOCUMENT_SETTINGS, markdown: true })
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [margin, setMargin] = useState<MarginPreset>('narrow')
  const [allSheets, setAllSheets] = useState(true)
  const [notes, setNotes] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const { busy, error, run } = useTask()
  const meta = META[kind]
  const Icon = meta.icon

  const convertOne = async (file: File): Promise<FileArtifact> => {
    const { stem } = splitFileName(file.name)
    const source = { name: file.name, size: file.size }
    const bytes = await toBytes(file)
    if (kind === 'word') {
      const docx = readDocx(bytes)
      const layout = await layoutTextDocument(docx.blocks, settings)
      const caveats = [docx.skippedGraphics ? t('pdf.office.skippedGraphics', { count: docx.skippedGraphics }) : '', layout.lossyGlyphs ? t('pdf.office.lossy') : ''].filter(Boolean)
      return pdfArtifact(`${stem}.pdf`, await layoutBytes(layout), { source, note: caveats.join(' ') || t('pdf.office.wordNote') })
    }
    if (kind === 'excel') {
      const sheets = readXlsx(bytes).filter((sheet) => sheet.rows.length)
      if (!sheets.length) throw new Error(t('pdf.office.emptyWorkbook', { name: file.name }))
      const chosen = allSheets ? sheets : sheets.slice(0, 1)
      const layouts = await Promise.all(chosen.map((sheet) => layoutTablePdf(sheet.rows, { pageSize, margin, title: chosen.length > 1 ? sheet.name : stem })))
      const merged: PdfLayout = { title: stem, lossyGlyphs: layouts.some((layout) => layout.lossyGlyphs), pages: layouts.flatMap((layout) => layout.pages) }
      return pdfArtifact(`${stem}.pdf`, await layoutBytes(merged), { source, note: t('pdf.office.excelNote', { count: chosen.length }) })
    }
    const presentation = readPptx(bytes)
    const { bytes: pdf, lossy } = await renderPresentation(presentation, { notes })
    const caveats = [presentation.skipped ? t('pdf.office.skippedShapes', { count: presentation.skipped }) : '', lossy ? t('pdf.office.lossy') : ''].filter(Boolean)
    return pdfArtifact(`${stem}.pdf`, pdf, { source, note: caveats.join(' ') || t('pdf.office.pptxNote', { count: presentation.slides.length }) })
  }

  const convert = () =>
    run(async () => {
      const artifacts: FileArtifact[] = []
      setProgress(0)
      for (const [index, entry] of files.entries()) {
        try {
          artifacts.push(await convertOne(entry.file))
        } catch (cause) {
          throw new Error(t('pdf.office.failed', { name: entry.file.name, reason: cause instanceof Error ? cause.message : String(cause) }), { cause })
        }
        setProgress((index + 1) / files.length)
      }
      showResults({ artifacts, zipName: `${kind}-pdf.zip` })
    }).finally(() => setProgress(null))

  return (
    <div className="flex flex-col gap-3">
      <SourceFiles
        files={files}
        onAdd={add}
        onRemove={remove}
        onMove={move}
        onClear={clear}
        accept={meta.accept}
        title={t(`pdf.office.drop.${kind}`)}
        hint={t('pdf.office.dropHint')}
        glyphs={meta.glyphs}
        formats={meta.formats}
      />
      {files.length > 0 && (
        <PanelSection title={t('pdf.office.options')} icon={<SlidersHorizontalIcon />}>
          {kind === 'word' && <DocumentSettingsForm value={settings} onChange={setSettings} compact />}
          {kind === 'excel' && (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <OptionField label={t('pdf.office.pageSize')}>
                  <Segmented
                    ariaLabel={t('pdf.office.pageSize')}
                    value={pageSize}
                    onValueChange={setPageSize}
                    options={[
                      { value: 'a4', label: 'A4' },
                      { value: 'letter', label: t('pdf.images.letter') },
                      { value: 'legal', label: t('pdf.office.legal') },
                    ]}
                  />
                </OptionField>
                <OptionField label={t('pdf.office.margin')}>
                  <Segmented
                    ariaLabel={t('pdf.office.margin')}
                    value={margin}
                    onValueChange={setMargin}
                    options={(['narrow', 'normal', 'wide'] as const).map((value) => ({ value, label: t(`pdf.office.margins.${value}`) }))}
                  />
                </OptionField>
              </div>
              <OptionSwitch label={t('pdf.office.allSheets')} hint={t('pdf.office.allSheetsHint')} checked={allSheets} onChange={setAllSheets} />
            </>
          )}
          {kind === 'powerpoint' && <OptionSwitch label={t('pdf.office.notes')} hint={t('pdf.office.notesHint')} checked={notes} onChange={setNotes} />}
          <p className="text-[11px] text-muted-foreground">{t(`pdf.office.fidelity.${kind}`)}</p>
        </PanelSection>
      )}
      {error && <PanelError message={error} />}
      {files.length > 0 && (
        <ActionBar progress={progress}>
          <Button onClick={() => void convert()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
            {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
            {t('pdf.office.run', { count: files.length })}
          </Button>
        </ActionBar>
      )}
    </div>
  )
}
