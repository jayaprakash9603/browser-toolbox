import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileMinusIcon, FileOutputIcon, LoaderCircleIcon, MousePointerClickIcon } from 'lucide-react'

import { removePages, splitPdf } from '@/core/engines/pdf/edit'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { PagePicker } from './PagePicker'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

/** Remove pages deletes the chosen pages in place; extract pages copies them into new files. */
export function PagesPanel({ mode }: { mode: 'remove' | 'extract' }) {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [separate, setSeparate] = useState(false)
  const { busy, error, run } = useTask()
  const pages = [...selected].sort((a, b) => a - b)
  const stem = stemOf(doc)
  const removingAll = mode === 'remove' && pages.length >= total

  const apply = () =>
    run(async () => {
      const source = { name: doc.name, size: doc.bytes.length }
      if (mode === 'remove') {
        const bytes = await removePages(sourceOf(doc), pages)
        showResults({ artifacts: [pdfArtifact(`${stem}-trimmed.pdf`, bytes, { source, note: t('pdf.pages.removedNote', { count: pages.length, left: total - pages.length }) })] })
        return
      }
      const groups = separate ? pages.map((page) => [page]) : [pages]
      const files = await splitPdf(sourceOf(doc), groups)
      showResults({
        artifacts: files.map((bytes, index) =>
          pdfArtifact(separate ? `${stem}-page-${groups[index][0] + 1}.pdf` : `${stem}-extract.pdf`, bytes, separate ? {} : { source }),
        ),
        zipName: `${stem}-pages.zip`,
      })
    })

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={mode === 'remove' ? t('pdf.pages.removeTitle') : t('pdf.pages.extractTitle')}
        icon={<MousePointerClickIcon />}
        actions={
          <span className="text-[11px] tabular-nums text-muted-foreground" role="status" aria-live="polite">
            {t('pdf.pages.selected', { count: pages.length, total })}
          </span>
        }
      >
        <p className="text-[11px] text-muted-foreground">{mode === 'remove' ? t('pdf.pages.removeHint') : t('pdf.pages.extractHint')}</p>
        <PagePicker doc={doc} selected={selected} onChange={setSelected} tone={mode === 'remove' ? 'remove' : 'keep'} />
      </PanelSection>

      {mode === 'extract' && (
        <OptionSwitch label={t('pdf.pages.separate')} hint={t('pdf.pages.separateHint')} checked={separate} onChange={setSeparate} />
      )}
      {removingAll && <PanelError message={t('pdf.pages.removeAll')} />}
      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void apply()} disabled={busy || !pages.length || removingAll} variant={mode === 'remove' ? 'destructive' : 'default'} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : mode === 'remove' ? <FileMinusIcon aria-hidden /> : <FileOutputIcon aria-hidden />}
          {mode === 'remove' ? t('pdf.pages.removeRun', { count: pages.length }) : t('pdf.pages.extractRun', { count: pages.length })}
        </Button>
        {mode === 'remove' && pages.length > 0 && !removingAll && (
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{t('pdf.pages.left', { count: total - pages.length })}</span>
        )}
      </ActionBar>
    </div>
  )
}
