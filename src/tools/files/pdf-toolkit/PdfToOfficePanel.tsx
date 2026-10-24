import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheetIcon, LayersIcon, LoaderCircleIcon, MonitorPlayIcon, SlidersHorizontalIcon, Table2Icon } from 'lucide-react'

import { imagesToPptx, type SlideImage } from '@/core/engines/files/pptx'
import { sheetsToXlsx, type SheetInput } from '@/core/engines/files/xlsx'
import { compactTable, groupLines, linesToTable } from '@/core/engines/pdf/textLayout'
import { bytesBlob, createArtifact } from '@/shared/components/files'
import { ActionBar, OptionField, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { ChoiceCards } from './ChoiceCards'
import { rasterizePage, readAllPages } from './rasterize'
import { stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Quality = 'standard' | 'high'
type SheetLayout = 'per-page' | 'single'

const DPI: Record<Quality, number> = { standard: 144, high: 220 }
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

/** PowerPoint gets one picture slide per page; Excel gets rows and columns rebuilt from text positions. */
export function PdfToOfficePanel({ kind }: { kind: 'powerpoint' | 'excel' }) {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [quality, setQuality] = useState<Quality>('standard')
  const [layout, setLayout] = useState<SheetLayout>('per-page')
  const [header, setHeader] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const { busy, error, run } = useTask()
  const stem = stemOf(doc)

  const toPowerPoint = async () => {
    const slides: SlideImage[] = []
    for (const [index, info] of doc.pages.entries()) {
      const spec = await rasterizePage(doc.handle, index, info, { dpi: DPI[quality], quality: 0.86 })
      if (spec.kind === 'image') slides.push({ bytes: spec.bytes, format: spec.format, width: spec.width, height: spec.height })
      setProgress((index + 1) / doc.pages.length)
    }
    showResults({
      artifacts: [
        createArtifact({
          name: `${stem}.pptx`,
          blob: bytesBlob(imagesToPptx(slides, stem), PPTX_TYPE),
          format: 'PPTX',
          preview: { kind: 'binary' },
          note: t('pdf.toOffice.pptxNote', { count: slides.length }),
        }),
      ],
    })
  }

  const toExcel = async () => {
    const pages = await readAllPages(doc.handle, { onProgress: (done, total) => setProgress(done / total) })
    const tables = pages.map((page) => compactTable(linesToTable(groupLines(page.runs))))
    if (!tables.some((rows) => rows.length)) throw new Error(t('pdf.toOffice.noText'))
    const sheets: SheetInput[] =
      layout === 'single'
        ? [{ name: stem, rows: compactTable(tables.flatMap((rows, index) => (index && rows.length ? [[], ...rows] : rows))), header }]
        : tables.map((rows, index) => ({ name: t('pdf.toOffice.sheetName', { page: index + 1 }), rows, header })).filter((sheet) => sheet.rows.length)
    const columns = Math.max(...sheets.flatMap((sheet) => sheet.rows.map((row) => row.length)))
    showResults({
      artifacts: [
        createArtifact({
          name: `${stem}.xlsx`,
          blob: bytesBlob(sheetsToXlsx(sheets), XLSX_TYPE),
          format: 'XLSX',
          preview: { kind: 'table', rows: sheets[0].rows.slice(0, 200) },
          note: t('pdf.toOffice.xlsxNote', { count: sheets.length, columns }),
        }),
      ],
    })
  }

  const convert = () => run(kind === 'powerpoint' ? toPowerPoint : toExcel).finally(() => setProgress(null))

  return (
    <div className="flex flex-col gap-3">
      {kind === 'powerpoint' ? (
        <PanelSection title={t('pdf.toOffice.slides')} icon={<MonitorPlayIcon />}>
          <OptionField label={t('pdf.toOffice.quality')}>
            <Segmented
              ariaLabel={t('pdf.toOffice.quality')}
              value={quality}
              onValueChange={setQuality}
              options={[
                { value: 'standard', label: t('pdf.toOffice.standard') },
                { value: 'high', label: t('pdf.toOffice.high') },
              ]}
              className="self-start"
            />
          </OptionField>
          <p className="text-[11px] text-muted-foreground">{t('pdf.toOffice.pptxHint')}</p>
        </PanelSection>
      ) : (
        <PanelSection title={t('pdf.toOffice.sheets')} icon={<SlidersHorizontalIcon />}>
          <ChoiceCards
            label={t('pdf.toOffice.sheets')}
            value={layout}
            onChange={setLayout}
            className="@[560px]:grid-cols-2"
            choices={[
              { value: 'per-page', icon: LayersIcon, label: t('pdf.toOffice.perPage'), hint: t('pdf.toOffice.perPageHint') },
              { value: 'single', icon: Table2Icon, label: t('pdf.toOffice.single'), hint: t('pdf.toOffice.singleHint') },
            ]}
          />
          <OptionSwitch label={t('pdf.toOffice.header')} hint={t('pdf.toOffice.headerHint')} checked={header} onChange={setHeader} />
        </PanelSection>
      )}
      {error && <PanelError message={error} />}
      <ActionBar progress={progress}>
        <Button onClick={() => void convert()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : kind === 'powerpoint' ? <MonitorPlayIcon aria-hidden /> : <FileSpreadsheetIcon aria-hidden />}
          {kind === 'powerpoint' ? t('pdf.toOffice.runPptx') : t('pdf.toOffice.runXlsx')}
        </Button>
      </ActionBar>
    </div>
  )
}
