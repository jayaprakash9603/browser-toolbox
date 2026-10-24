import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2Icon, CircleXIcon, ImagesIcon, LoaderCircleIcon, WrenchIcon } from 'lucide-react'

import { assemblePdf, rebuildPdf } from '@/core/engines/pdf/edit'
import { closePdfDocument, openPdfDocument, readPageInfo } from '@/core/engines/pdf/pdfjs'
import { splitFileName, type FileArtifact } from '@/shared/components/files'
import { ActionBar, OptionSwitch, PanelError } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { rasterizePages } from './rasterize'
import { SourceFiles } from './SourceFiles'
import { pdfArtifact, usePdfSession } from './session'
import { useSourceFiles } from './useSourceFiles'
import { useTask } from './useTask'

type Outcome = { status: 'working' } | { status: 'rebuilt' | 'redrawn'; pages: number } | { status: 'failed'; reason: string }

async function pageCount(bytes: Uint8Array): Promise<number> {
  const handle = await openPdfDocument(bytes)
  try {
    return handle.numPages
  } finally {
    void closePdfDocument(handle)
  }
}

/** Rewrites damaged files from the objects that can still be read, or redraws pages PDF.js can still render. */
export function RepairPanel() {
  const { t } = useTranslation()
  const { showResults } = usePdfSession()
  const { files, add, remove, clear } = useSourceFiles()
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [allowRedraw, setAllowRedraw] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const { busy, error, run } = useTask()

  const repairOne = async (file: File): Promise<{ bytes: Uint8Array; outcome: Outcome }> => {
    const original = new Uint8Array(await file.arrayBuffer())
    let rebuildError: unknown
    try {
      const bytes = await rebuildPdf(original)
      const pages = await pageCount(bytes)
      if (pages > 0) return { bytes, outcome: { status: 'rebuilt', pages } }
    } catch (cause) {
      rebuildError = cause
    }
    if (!allowRedraw) throw rebuildError instanceof Error ? rebuildError : new Error(t('pdf.repair.unreadable'))
    const handle = await openPdfDocument(original)
    try {
      const info = await readPageInfo(handle)
      const specs = await rasterizePages(handle, info, { dpi: 170, quality: 0.9 })
      return { bytes: await assemblePdf([], specs), outcome: { status: 'redrawn', pages: info.length } }
    } finally {
      void closePdfDocument(handle)
    }
  }

  const repair = () =>
    run(async () => {
      const artifacts: FileArtifact[] = []
      setOutcomes(Object.fromEntries(files.map((entry) => [entry.id, { status: 'working' } as Outcome])))
      setProgress(0)
      for (const [index, entry] of files.entries()) {
        try {
          const { bytes, outcome } = await repairOne(entry.file)
          setOutcomes((current) => ({ ...current, [entry.id]: outcome }))
          artifacts.push(
            pdfArtifact(`${splitFileName(entry.file.name).stem}-repaired.pdf`, bytes, {
              source: { name: entry.file.name, size: entry.file.size },
              note: outcome.status === 'redrawn' ? t('pdf.repair.redrawnNote') : t('pdf.repair.rebuiltNote'),
            }),
          )
        } catch (cause) {
          const reason = cause instanceof Error && /password|encrypt/i.test(cause.message) ? t('pdf.repair.encrypted') : t('pdf.repair.unreadable')
          setOutcomes((current) => ({ ...current, [entry.id]: { status: 'failed', reason } }))
        }
        setProgress((index + 1) / files.length)
      }
      if (!artifacts.length) throw new Error(t('pdf.repair.allFailed'))
      showResults({ artifacts, zipName: 'repaired-pdfs.zip' })
    }).finally(() => setProgress(null))

  return (
    <div className="flex flex-col gap-3">
      <SourceFiles
        files={files}
        onAdd={(picked) => {
          add(picked)
          setOutcomes({})
        }}
        onRemove={remove}
        onClear={clear}
        accept="application/pdf,.pdf"
        title={t('pdf.repair.drop')}
        hint={t('pdf.repair.dropHint')}
        glyphs={['pdf', 'pdf', 'pdf']}
        formats={['PDF']}
        describe={(entry) => {
          const outcome = outcomes[entry.id]
          if (!outcome) return null
          if (outcome.status === 'working') return <LoaderCircleIcon className="size-3 animate-spin" aria-label={t('pdf.repair.working')} />
          if (outcome.status === 'failed')
            return (
              <span className="inline-flex items-center gap-1 text-destructive">
                <CircleXIcon className="size-3" aria-hidden />
                {outcome.reason}
              </span>
            )
          return (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              {outcome.status === 'rebuilt' ? <CheckCircle2Icon className="size-3" aria-hidden /> : <ImagesIcon className="size-3" aria-hidden />}
              {t(`pdf.repair.${outcome.status}`, { count: outcome.pages })}
            </span>
          )
        }}
      />
      {files.length > 0 && <OptionSwitch label={t('pdf.repair.redraw')} hint={t('pdf.repair.redrawHint')} checked={allowRedraw} onChange={setAllowRedraw} />}
      {error && <PanelError message={error} />}
      {files.length > 0 && (
        <ActionBar progress={progress}>
          <Button onClick={() => void repair()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
            {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <WrenchIcon aria-hidden />}
            {t('pdf.repair.run', { count: files.length })}
          </Button>
        </ActionBar>
      )}
    </div>
  )
}
