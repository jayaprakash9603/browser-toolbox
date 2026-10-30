import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightIcon,
  FileTextIcon,
  LanguagesIcon,
  LayoutTemplateIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import {
  createTranslator,
  detectLanguage,
  hasTranslator,
  translatorAvailability,
  type Availability,
} from '@/core/engines/ai/builtin'
import { docToDocx } from '@/core/engines/files/docx'
import { DEFAULT_DOCUMENT_SETTINGS, type DocBlock } from '@/core/engines/files/document'
import { editPdf, type EditItem } from '@/core/engines/pdf/edit'
import { extractPageText } from '@/core/engines/pdf/pdfjs'
import { groupBlocks, groupLines } from '@/core/engines/pdf/textLayout'
import { bytesBlob, createArtifact } from '@/shared/components/files'
import { ActionBar, OptionSelect, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { ChoiceCards } from './ChoiceCards'
import { isRtl, languageName, LANGUAGES, preferredTarget } from './languages'
import { paragraphImage } from './raster'
import { readAllPages } from './rasterize'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Output = 'layout' | 'document'

/** Translates with Chrome's on-device Translator, keeping the page layout or writing a Word document. */
export function TranslatePanel() {
  const { t, i18n } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [detected, setDetected] = useState<string | null>(null)
  const [source, setSource] = useState('auto')
  const [target, setTarget] = useState(() => preferredTarget(null))
  const [output, setOutput] = useState<Output>('layout')
  const [checked, setChecked] = useState<{ pair: string; value: Availability } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const { busy, error, run } = useTask()
  const supported = hasTranslator()
  const from = source === 'auto' ? detected : source

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const sample: string[] = []
      for (let page = 1; page <= Math.min(3, doc.pages.length); page += 1)
        sample.push(await extractPageText(doc.handle, page))
      const language = await detectLanguage(sample.join('\n'))
      if (cancelled) return
      setDetected(language)
      setTarget((current) => (current === language ? preferredTarget(language) : current))
    })()
    return () => {
      cancelled = true
    }
  }, [doc.handle, doc.pages.length])

  const pair = from && from !== target ? `${from}>${target}` : null
  useEffect(() => {
    if (!from || from === target) return
    let cancelled = false
    void translatorAvailability(from, target).then(
      (value) => !cancelled && setChecked({ pair: `${from}>${target}`, value }),
    )
    return () => {
      cancelled = true
    }
  }, [from, target])
  const availability: Availability | null = checked && checked.pair === pair ? checked.value : null

  const languageOptions = useMemo(
    () =>
      LANGUAGES.map((code) => ({ value: code as string, label: languageName(code, locale) })).sort(
        (a, b) => a.label.localeCompare(b.label, locale),
      ),
    [locale],
  )

  const translate = () =>
    run(async () => {
      if (!from) throw new Error(t('pdf.translate.pickSource'))
      setStatus(t('pdf.translate.preparing'))
      const translator = await createTranslator(from, target, {
        onDownload: (fraction) =>
          setStatus(t('pdf.translate.downloading', { percent: Math.round(fraction * 100) })),
      })
      const stem = stemOf(doc)
      try {
        const pages = await readAllPages(doc.handle, { fonts: true })
        const blocksPerPage = pages.map((page) => groupBlocks(groupLines(page.runs)))
        const count = blocksPerPage.reduce((sum, blocks) => sum + blocks.length, 0)
        if (!count) throw new Error(t('pdf.translate.noText'))
        let done = 0
        const step = () => {
          done += 1
          setProgress(done / count)
          setStatus(t('pdf.translate.progress', { count, done, total: count }))
        }

        if (output === 'layout') {
          const items: EditItem[] = []
          for (const [index, blocks] of blocksPerPage.entries()) {
            const { width, height } = pages[index]
            for (const block of blocks) {
              const text = await translator.translate(block.text)
              const pad = block.size * 0.15
              const box = {
                x: block.x - pad,
                y: block.y - pad,
                w: block.w + pad * 2,
                h: block.h + pad * 2,
              }
              const bytes = await paragraphImage(text, {
                width: box.w,
                height: box.h,
                fontSize: block.size,
                bold: block.lines[0]?.bold,
                rtl: isRtl(target),
              })
              const frame = {
                page: index,
                u: box.x / width,
                v: box.y / height,
                w: box.w / width,
                h: box.h / height,
              }
              items.push(
                { kind: 'rect', ...frame, color: '#ffffff', opacity: 1 },
                { kind: 'image', ...frame, bytes, format: 'png' },
              )
              step()
            }
          }
          const bytes = await editPdf(sourceOf(doc), { items })
          showResults({
            artifacts: [
              pdfArtifact(`${stem}-${target}.pdf`, bytes, {
                note: t('pdf.translate.layoutNote', {
                  from: languageName(from, locale),
                  to: languageName(target, locale),
                }),
              }),
            ],
          })
        } else {
          const blocks: DocBlock[] = []
          const runs = pages.flatMap((page) => page.runs)
          const chars = runs.reduce((sum, run) => sum + run.str.length, 0)
          const body =
            runs.reduce((sum, run) => sum + run.size * run.str.length, 0) / Math.max(1, chars)
          for (const pageBlocks of blocksPerPage) {
            for (const block of pageBlocks) {
              const text = await translator.translate(block.text)
              const heading = block.size > body * 1.25 && text.length < 160
              blocks.push(
                heading
                  ? { type: 'heading', level: block.size > body * 1.6 ? 1 : 2, runs: [{ text }] }
                  : { type: 'paragraph', runs: [{ text, bold: block.lines[0]?.bold }] },
              )
              step()
            }
          }
          const settings = { ...DEFAULT_DOCUMENT_SETTINGS, title: `${stem} (${target})` }
          showResults({
            artifacts: [
              createArtifact({
                name: `${stem}-${target}.docx`,
                blob: bytesBlob(
                  docToDocx(blocks, settings),
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ),
                format: 'DOCX',
                preview: { kind: 'document', blocks, settings },
                note: t('pdf.translate.documentNote', {
                  from: languageName(from, locale),
                  to: languageName(target, locale),
                }),
              }),
            ],
          })
        }
      } finally {
        translator.destroy()
      }
    }).finally(() => {
      setStatus(null)
      setProgress(null)
    })

  if (!supported) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center">
        <span
          className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
          aria-hidden
        >
          <LanguagesIcon className="size-6" />
        </span>
        <p className="text-sm font-semibold">{t('pdf.translate.unsupportedTitle')}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {t('pdf.translate.unsupportedText')}
        </p>
      </div>
    )
  }

  const pairBlocked = availability === 'unavailable'
  return (
    <div className="flex flex-col gap-3">
      <PanelSection title={t('pdf.translate.languages')} icon={<LanguagesIcon />}>
        <div className="grid items-end gap-2 @[520px]:grid-cols-[1fr_auto_1fr]">
          <OptionSelect
            label={t('pdf.translate.from')}
            value={source}
            onChange={setSource}
            options={[
              {
                value: 'auto',
                label: detected
                  ? t('pdf.translate.detected', { language: languageName(detected, locale) })
                  : t('pdf.translate.detect'),
              },
              ...languageOptions,
            ]}
          />
          <ArrowRightIcon
            className="mx-auto mb-2 hidden size-4 text-muted-foreground @[520px]:block"
            aria-hidden
          />
          <OptionSelect
            label={t('pdf.translate.to')}
            value={target}
            onChange={setTarget}
            options={languageOptions}
          />
        </div>
        {source === 'auto' && !detected && (
          <p className="text-[11px] text-muted-foreground">{t('pdf.translate.detectHint')}</p>
        )}
        {from === target && <PanelError message={t('pdf.translate.same')} />}
        {pairBlocked && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
            <TriangleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden />
            {t('pdf.translate.pairUnavailable')}
          </p>
        )}
        {availability === 'downloadable' && (
          <p className="text-[11px] text-muted-foreground">{t('pdf.translate.willDownload')}</p>
        )}
      </PanelSection>
      <PanelSection title={t('pdf.translate.output')} icon={<LayoutTemplateIcon />}>
        <ChoiceCards
          label={t('pdf.translate.output')}
          value={output}
          onChange={setOutput}
          className="@[560px]:grid-cols-2"
          choices={[
            {
              value: 'layout',
              icon: LayoutTemplateIcon,
              label: t('pdf.translate.layout'),
              hint: t('pdf.translate.layoutHint'),
            },
            {
              value: 'document',
              icon: FileTextIcon,
              label: t('pdf.translate.document'),
              hint: t('pdf.translate.documentHint'),
            },
          ]}
        />
      </PanelSection>
      {error && <PanelError message={error} />}
      <ActionBar progress={progress}>
        <Button
          onClick={() => void translate()}
          disabled={busy || !from || from === target || pairBlocked}
          className="min-w-40 flex-1 @[480px]:flex-none"
        >
          {busy ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            <LanguagesIcon aria-hidden />
          )}
          {t('pdf.translate.run', { language: languageName(target, locale) })}
        </Button>
        {status && (
          <span
            className="ml-auto text-[11px] text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {status}
          </span>
        )}
      </ActionBar>
    </div>
  )
}
