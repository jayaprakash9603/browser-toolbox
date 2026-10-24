import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CpuIcon, ListChecksIcon, LoaderCircleIcon, SparklesIcon, TextQuoteIcon } from 'lucide-react'

import { summarizeWithAi, summarizerAvailability, type Availability, type SummaryLength, type SummaryType } from '@/core/engines/ai/builtin'
import { DEFAULT_DOCUMENT_SETTINGS, parseDocument } from '@/core/engines/files/document'
import { extractPageText } from '@/core/engines/pdf/pdfjs'
import { extractiveSummary, topKeywords } from '@/core/engines/pdf/textLayout'
import { createArtifact } from '@/shared/components/files'
import { ActionBar, OptionField, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { ChoiceCards } from './ChoiceCards'
import { stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Engine = 'ai' | 'quick'

const SENTENCES: Record<SummaryLength, number> = { short: 3, medium: 6, long: 10 }
const TYPES: SummaryType[] = ['key-points', 'tldr', 'teaser', 'headline']
const LENGTHS: SummaryLength[] = ['short', 'medium', 'long']

/** Summaries come from Chrome's on-device model when present, otherwise from the most representative sentences. */
export function SummarizePanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [engine, setEngine] = useState<Engine>('quick')
  const [type, setType] = useState<SummaryType>('key-points')
  const [length, setLength] = useState<SummaryLength>('medium')
  const [keywords, setKeywords] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const { busy, error, run } = useTask()

  useEffect(() => {
    let cancelled = false
    void summarizerAvailability().then((value) => {
      if (cancelled) return
      setAvailability(value)
      if (value !== 'unavailable') setEngine('ai')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const summarize = () =>
    run(async () => {
      setStatus(t('pdf.summarize.reading'))
      const parts: string[] = []
      for (let page = 1; page <= doc.pages.length; page += 1) {
        parts.push(await extractPageText(doc.handle, page))
        setProgress((page / doc.pages.length) * (engine === 'ai' ? 0.3 : 1))
      }
      const text = parts.join('\n\n').trim()
      if (text.length < 40) throw new Error(t('pdf.summarize.noText'))
      const words = text.split(/\s+/).length

      let body: string
      if (engine === 'ai') {
        setStatus(t('pdf.summarize.thinking'))
        body = await summarizeWithAi({
          text,
          type,
          length,
          context: t('pdf.summarize.context', { name: doc.name }),
          onDownload: (fraction) => {
            setStatus(t('pdf.summarize.downloading', { percent: Math.round(fraction * 100) }))
            setProgress(fraction * 0.3)
          },
          onChunk: (done, total) => {
            setStatus(t('pdf.summarize.chunk', { done, total }))
            setProgress(0.3 + (done / total) * 0.6)
          },
        })
      } else {
        body = extractiveSummary(text, SENTENCES[length])
          .map((sentence) => `- ${sentence}`)
          .join('\n')
      }
      const tags = keywords ? topKeywords(text, 12) : []
      const markdown = [
        `# ${t('pdf.summarize.heading', { name: stemOf(doc) })}`,
        body.trim(),
        tags.length ? `## ${t('pdf.summarize.keywords')}\n\n${tags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
      const minutes = Math.max(1, Math.round(words / 230))
      showResults({
        artifacts: [
          createArtifact({
            name: `${stemOf(doc)}-summary.md`,
            blob: new Blob([markdown], { type: 'text/markdown' }),
            format: 'MD',
            preview: { kind: 'document', blocks: parseDocument(markdown, true), settings: { ...DEFAULT_DOCUMENT_SETTINGS, pageNumbers: false } },
            note: t(engine === 'ai' ? 'pdf.summarize.noteAi' : 'pdf.summarize.noteQuick', { words: words.toLocaleString(), minutes }),
          }),
        ],
      })
    }).finally(() => {
      setStatus(null)
      setProgress(null)
    })

  const aiReady = availability !== null && availability !== 'unavailable'
  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.summarize.engine')} icon={<SparklesIcon />}>
        <ChoiceCards
          label={t('pdf.summarize.engine')}
          value={engine}
          onChange={setEngine}
          className="@[560px]:grid-cols-2"
          choices={[
            {
              value: 'ai',
              icon: CpuIcon,
              label: t('pdf.summarize.ai'),
              hint: availability === null ? t('pdf.summarize.checking') : aiReady ? t(availability === 'available' ? 'pdf.summarize.aiReady' : 'pdf.summarize.aiDownload') : t('pdf.summarize.aiMissing'),
              badge: t('pdf.summarize.onDevice'),
              disabled: !aiReady,
            },
            { value: 'quick', icon: TextQuoteIcon, label: t('pdf.summarize.quick'), hint: t('pdf.summarize.quickHint') },
          ]}
        />
      </PanelSection>
      <PanelSection title={t('pdf.summarize.options')} icon={<ListChecksIcon />}>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {engine === 'ai' && (
            <OptionField label={t('pdf.summarize.type')}>
              <Segmented ariaLabel={t('pdf.summarize.type')} value={type} onValueChange={setType} options={TYPES.map((value) => ({ value, label: t(`pdf.summarize.types.${value}`) }))} />
            </OptionField>
          )}
          <OptionField label={t('pdf.summarize.length')}>
            <Segmented ariaLabel={t('pdf.summarize.length')} value={length} onValueChange={setLength} options={LENGTHS.map((value) => ({ value, label: t(`pdf.summarize.lengths.${value}`) }))} />
          </OptionField>
        </div>
        <OptionSwitch label={t('pdf.summarize.withKeywords')} hint={t('pdf.summarize.withKeywordsHint')} checked={keywords} onChange={setKeywords} />
      </PanelSection>
      {error && <PanelError message={error} />}
      <ActionBar progress={progress}>
        <Button onClick={() => void summarize()} disabled={busy} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <SparklesIcon aria-hidden />}
          {t('pdf.summarize.run')}
        </Button>
        {status && (
          <span className="ml-auto text-[11px] text-muted-foreground" role="status" aria-live="polite">
            {status}
          </span>
        )}
      </ActionBar>
    </div>
  )
}
