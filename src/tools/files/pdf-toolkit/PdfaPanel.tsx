import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArchiveIcon, CheckCircle2Icon, LoaderCircleIcon, PaperclipIcon, ShieldCheckIcon, TriangleAlertIcon, LandmarkIcon } from 'lucide-react'

import { assemblePdf } from '@/core/engines/pdf/edit'
import { convertToPdfA, type PdfAPart, type PdfAReport } from '@/core/engines/pdf/pdfa'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { ChoiceCards } from './ChoiceCards'
import { rasterizePages } from './rasterize'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Part = '1' | '2' | '3'

function ReportList({ report, flattened }: { report: PdfAReport; flattened: boolean }) {
  const { t } = useTranslation()
  const checks = [
    { ok: true, text: t('pdf.pdfa.check.metadata') },
    { ok: true, text: t('pdf.pdfa.check.colour') },
    { ok: !report.unembeddedFonts.length, text: report.unembeddedFonts.length ? t('pdf.pdfa.check.fontsMissing', { fonts: report.unembeddedFonts.slice(0, 4).join(', '), count: report.unembeddedFonts.length }) : t('pdf.pdfa.check.fonts') },
    { ok: !report.transparency, text: report.transparency ? t('pdf.pdfa.check.transparency') : t('pdf.pdfa.check.noTransparency') },
  ]
  if (report.removedJavaScript) checks.push({ ok: true, text: t('pdf.pdfa.check.javascript') })
  if (report.removedEncryption) checks.push({ ok: true, text: t('pdf.pdfa.check.encryption') })
  if (flattened) checks.push({ ok: true, text: t('pdf.pdfa.check.flattened') })
  return (
    <ul className="flex flex-col gap-1.5">
      {checks.map((check) => (
        <li key={check.text} className="flex items-start gap-2 text-xs">
          {check.ok ? <CheckCircle2Icon className="mt-px size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /> : <TriangleAlertIcon className="mt-px size-3.5 shrink-0 text-amber-600" aria-hidden />}
          <span>{check.text}</span>
        </li>
      ))}
    </ul>
  )
}

/** Converts to PDF/A-1b, 2b or 3b and reports anything it could not make compliant. */
export function PdfaPanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [part, setPart] = useState<Part>('2')
  const [flatten, setFlatten] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [last, setLast] = useState<{ report: PdfAReport; flattened: boolean } | null>(null)
  const { busy, error, run } = useTask()

  const convert = () =>
    run(async () => {
      let source = sourceOf(doc)
      if (flatten) {
        setProgress(0)
        const specs = await rasterizePages(doc.handle, doc.pages, { dpi: 200, quality: 0.9, onProgress: (done, total) => setProgress(done / total) })
        source = { bytes: await assemblePdf([source], specs, { metadataFrom: 0 }) }
      }
      const { bytes, report } = await convertToPdfA(source, Number(part) as PdfAPart)
      setLast({ report, flattened: flatten })
      const issues = report.unembeddedFonts.length > 0 || (report.transparency && part === '1')
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}-pdfa-${part}b.pdf`, bytes, {
            source: { name: doc.name, size: doc.bytes.length },
            note: issues ? t('pdf.pdfa.noteIssues', { part }) : t('pdf.pdfa.noteOk', { part }),
          }),
        ],
      })
    }).finally(() => setProgress(null))

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.pdfa.level')} icon={<ArchiveIcon />}>
        <ChoiceCards
          label={t('pdf.pdfa.level')}
          value={part}
          onChange={setPart}
          choices={[
            { value: '1', icon: LandmarkIcon, label: 'PDF/A-1b', hint: t('pdf.pdfa.part1') },
            { value: '2', icon: ShieldCheckIcon, label: 'PDF/A-2b', hint: t('pdf.pdfa.part2'), badge: t('pdf.pdfa.recommended') },
            { value: '3', icon: PaperclipIcon, label: 'PDF/A-3b', hint: t('pdf.pdfa.part3') },
          ]}
        />
        <OptionSwitch label={t('pdf.pdfa.flatten')} hint={t('pdf.pdfa.flattenHint')} checked={flatten} onChange={setFlatten} />
      </PanelSection>
      {last && (
        <PanelSection title={t('pdf.pdfa.report')} icon={<ShieldCheckIcon />}>
          <ReportList report={last.report} flattened={last.flattened} />
        </PanelSection>
      )}
      {error && <PanelError message={error} />}
      <ActionBar progress={progress}>
        <Button onClick={() => void convert()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <ArchiveIcon aria-hidden />}
          {t('pdf.pdfa.run', { part })}
        </Button>
      </ActionBar>
    </div>
  )
}
