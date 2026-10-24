import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileCodeIcon, LoaderCircleIcon, SlidersHorizontalIcon } from 'lucide-react'

import { pagesToMarkdown, type MarkdownOptions } from '@/core/engines/pdf/textLayout'
import { createArtifact } from '@/shared/components/files'
import { ActionBar, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { readAllPages } from './rasterize'
import { stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

const OPTIONS: (keyof MarkdownOptions)[] = ['headings', 'tables', 'links', 'pageBreaks']

/** Rebuilds headings, lists, tables and links from text positions and font sizes. */
export function MarkdownPanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [options, setOptions] = useState<MarkdownOptions>({ headings: true, links: true, tables: true, pageBreaks: false })
  const [progress, setProgress] = useState<number | null>(null)
  const { busy, error, run } = useTask()

  const convert = () =>
    run(async () => {
      setProgress(0)
      const pages = await readAllPages(doc.handle, { fonts: options.headings, links: options.links, onProgress: (done, total) => setProgress(done / total) })
      const markdown = pagesToMarkdown(pages, options)
      if (!markdown.trim()) throw new Error(t('pdf.markdown.empty'))
      showResults({
        artifacts: [
          createArtifact({
            name: `${stemOf(doc)}.md`,
            blob: new Blob([markdown], { type: 'text/markdown' }),
            format: 'MD',
            preview: { kind: 'text', text: markdown, language: 'text' },
            note: t('pdf.markdown.note', { words: markdown.split(/\s+/).filter(Boolean).length.toLocaleString() }),
          }),
        ],
      })
    }).finally(() => setProgress(null))

  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.markdown.options')} icon={<SlidersHorizontalIcon />}>
        <div className="grid gap-2 @[560px]:grid-cols-2">
          {OPTIONS.map((key) => (
            <OptionSwitch
              key={key}
              label={t(`pdf.markdown.${key}`)}
              hint={t(`pdf.markdown.${key}Hint`)}
              checked={options[key]}
              onChange={(checked) => setOptions((current) => ({ ...current, [key]: checked }))}
            />
          ))}
        </div>
      </PanelSection>
      {error && <PanelError message={error} />}
      <ActionBar progress={progress}>
        <Button onClick={() => void convert()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <FileCodeIcon aria-hidden />}
          {t('pdf.markdown.run')}
        </Button>
      </ActionBar>
    </div>
  )
}
