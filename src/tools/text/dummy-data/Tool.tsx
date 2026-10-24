import { useCallback, useId, useMemo, useState, type ReactNode } from 'react'
import { ChevronDownIcon, SlidersHorizontalIcon, SparklesIcon, WandSparklesIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import {
  buildDummyText,
  type DummyLineKind,
  type DummyTextFormat,
  type DummyTextVariant,
  type LoremMode,
} from '@/core/engines/text'
import { FadeIn } from '@/shared/components/motion/FadeIn'
import { ENTRANCE, STAGGER_SECTION_MS } from '@/shared/components/motion/motionConfig'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Segmented } from '@/shared/components/ui/segmented'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'
import { ToolActions, useTransformTool } from '../_shared'

const MODES = ['paragraphs', 'sentences', 'words', 'lines'] as const
const VARIANTS = ['lorem', 'random'] as const
const FORMATS = ['plain', 'html', 'markdown', 'json'] as const
const LINE_KINDS = ['text', 'names', 'emails', 'uuids'] as const
const SENTENCE_LENGTHS = ['short', 'medium', 'long'] as const

type PresetId = 'para3' | 'para5' | 'sent10' | 'words50' | 'names15' | 'emails10'

const PRESETS: {
  id: PresetId
  mode: LoremMode
  count: number
  variant?: DummyTextVariant
  lineKind?: DummyLineKind
  format?: DummyTextFormat
}[] = [
  { id: 'para3', mode: 'paragraphs', count: 3, variant: 'lorem' },
  { id: 'para5', mode: 'paragraphs', count: 5, variant: 'lorem' },
  { id: 'sent10', mode: 'sentences', count: 10, variant: 'lorem' },
  { id: 'words50', mode: 'words', count: 50, variant: 'lorem' },
  { id: 'names15', mode: 'lines', count: 15, lineKind: 'names', format: 'plain' },
  { id: 'emails10', mode: 'lines', count: 10, lineKind: 'emails', format: 'json' },
]

const SEGMENT_GRID: Record<number, string> = {
  2: 'grid w-full grid-cols-2',
  3: 'grid w-full grid-cols-3',
  4: 'grid w-full grid-cols-4',
}

function countMax(mode: LoremMode): number {
  return mode === 'words' ? 500 : 100
}

export default function DummyDataTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.dummy-data')
  const reduceMotion = useReducedMotion()
  const optionsId = useId()

  const [mode, setMode] = useDeepLinkParam('mode', MODES, 'paragraphs')
  const [variant, setVariant] = useDeepLinkParam('variant', VARIANTS, 'lorem')
  const [format, setFormat] = useDeepLinkParam('format', FORMATS, 'plain')
  const [lineKind, setLineKind] = useDeepLinkParam('lineKind', LINE_KINDS, 'text')
  const [sentenceLength, setSentenceLength] = useDeepLinkParam('length', SENTENCE_LENGTHS, 'medium')

  const [countText, setCountText] = useState('3')
  const [startWithLorem, setStartWithLorem] = useState(true)
  const [optionsOpen, setOptionsOpen] = useState(true)
  const [output, setOutput] = useState('')
  const [genTick, setGenTick] = useState(0)

  const max = countMax(mode)
  const count = parseNumberInRange(countText, 1, max)
  const sliderCount = count ?? 3
  const hasSentences = mode === 'paragraphs' || mode === 'sentences'

  const stats = useMemo(() => {
    if (!output) return null
    const words = output.trim() ? output.trim().split(/\s+/).length : 0
    return { chars: output.length, words }
  }, [output])

  const editorLanguage = format === 'json' || format === 'html' ? format : 'text'
  const codeOutput = format === 'json' || format === 'html'

  const summary = [
    `${count ?? '—'} ${t(`text.dummyMode.${mode}`).toLowerCase()}`,
    mode === 'lines' ? t(`text.dummyLineKind.${lineKind}`) : t(`text.variant${variant === 'lorem' ? 'Lorem' : 'Random'}`),
    t(`text.dummyFormat.${format}`),
  ].join(' · ')

  const runGenerate = useCallback(() => {
    if (count === null) return
    const next = buildDummyText({
      mode,
      count,
      variant,
      format,
      lineKind,
      startWithLorem: startWithLorem && variant === 'lorem',
      sentenceLength,
    })
    setOutput(next)
    setGenTick((n) => n + 1)
  }, [count, format, lineKind, mode, sentenceLength, startWithLorem, variant])

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const nextVariant = preset.variant ?? variant
    const nextLineKind = preset.lineKind ?? lineKind
    const nextFormat = preset.format ?? format
    setMode(preset.mode)
    setCountText(String(preset.count))
    if (preset.variant) setVariant(preset.variant)
    if (preset.lineKind) setLineKind(preset.lineKind)
    if (preset.format) setFormat(preset.format)
    const next = buildDummyText({
      mode: preset.mode,
      count: preset.count,
      variant: nextVariant,
      format: nextFormat,
      lineKind: nextLineKind,
      startWithLorem: startWithLorem && nextVariant === 'lorem',
      sentenceLength,
    })
    setOutput(next)
    setGenTick((n) => n + 1)
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <FadeIn className="shrink-0">
          <section className="rounded-xl border bg-card shadow-xs" aria-label={t('text.dummyOptions')}>
            <div className={cn('flex items-center gap-2 py-2 pr-2 pl-3', optionsOpen && 'border-b')}>
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={optionsOpen}
                aria-controls={optionsId}
                onClick={() => setOptionsOpen((open) => !open)}
              >
                <SlidersHorizontalIcon className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-xs font-semibold">{t('text.dummyOptions')}</span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">{summary}</span>
                <ChevronDownIcon
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200',
                    optionsOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
                <span className="sr-only">{optionsOpen ? t('text.dummyHideOptions') : t('text.dummyShowOptions')}</span>
              </button>
              <Button
                size="sm"
                className="shrink-0 gap-1.5 shadow-sm active:scale-[0.98]"
                disabled={count === null}
                onClick={runGenerate}
              >
                <SparklesIcon className="size-4" aria-hidden />
                {output ? t('text.dummyRegenerate') : t('text.generate')}
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {optionsOpen ? (
                <motion.div
                  id={optionsId}
                  key="options"
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, ease: ENTRANCE.ease }}
                  className="space-y-2.5 p-3"
                >
                  <OptionField label={t('text.dummySectionOutput')}>
                    <Segmented
                      ariaLabel={t('text.dummySectionOutput')}
                      value={mode}
                      onValueChange={(v) => setMode(v)}
                      options={MODES.map((m) => ({ value: m, label: t(`text.dummyMode.${m}`) }))}
                      className={SEGMENT_GRID[MODES.length]}
                    />
                  </OptionField>

                  <OptionPair>
                    <OptionField label={t('text.dummySectionStyle')}>
                      <Segmented
                        ariaLabel={t('text.dummySectionStyle')}
                        value={variant}
                        onValueChange={(v) => setVariant(v)}
                        options={VARIANTS.map((v) => ({
                          value: v,
                          label: t(`text.variant${v === 'lorem' ? 'Lorem' : 'Random'}`),
                        }))}
                        className={SEGMENT_GRID[VARIANTS.length]}
                      />
                    </OptionField>
                    {hasSentences ? (
                      <OptionField label={t('text.dummySentenceLength')}>
                        <Segmented
                          ariaLabel={t('text.dummySentenceLength')}
                          value={sentenceLength}
                          onValueChange={(v) => setSentenceLength(v)}
                          options={SENTENCE_LENGTHS.map((len) => ({ value: len, label: t(`text.dummyLength.${len}`) }))}
                          className={SEGMENT_GRID[SENTENCE_LENGTHS.length]}
                        />
                      </OptionField>
                    ) : null}
                  </OptionPair>

                  {mode === 'lines' ? (
                    <OptionField label={t('text.dummySectionLines')}>
                      <Segmented
                        ariaLabel={t('text.dummySectionLines')}
                        value={lineKind}
                        onValueChange={(v) => setLineKind(v)}
                        options={LINE_KINDS.map((kind) => ({ value: kind, label: t(`text.dummyLineKind.${kind}`) }))}
                        className={SEGMENT_GRID[LINE_KINDS.length]}
                      />
                    </OptionField>
                  ) : null}

                  <OptionField label={t('text.dummySectionFormat')}>
                    <Segmented
                      ariaLabel={t('text.dummySectionFormat')}
                      value={format}
                      onValueChange={(v) => setFormat(v)}
                      options={FORMATS.map((f) => ({ value: f, label: t(`text.dummyFormat.${f}`) }))}
                      className={SEGMENT_GRID[FORMATS.length]}
                    />
                  </OptionField>

                  <OptionPair>
                    <OptionField label={t('text.count')} hint={t('text.countRange', { max })}>
                      <div className="flex items-center gap-3">
                        <Slider
                          className="flex-1"
                          min={1}
                          max={max}
                          step={1}
                          value={[sliderCount]}
                          onValueChange={([v]) => setCountText(String(v))}
                          thumbLabel={t('text.count')}
                          getValueText={(v) => String(v)}
                        />
                        <NumberField
                          value={countText}
                          onChange={setCountText}
                          min={1}
                          max={max}
                          className="h-8 w-16"
                          ariaLabel={t('text.count')}
                        />
                      </div>
                    </OptionField>
                    {variant === 'lorem' && hasSentences ? (
                      <div className="flex min-h-8 items-center gap-2">
                        <Switch id="dummy-lorem-start" checked={startWithLorem} onCheckedChange={setStartWithLorem} />
                        <Label htmlFor="dummy-lorem-start" className="text-xs">
                          {t('text.dummyStartLorem')}
                        </Label>
                      </div>
                    ) : null}
                  </OptionPair>

                  <OptionField label={t('text.dummyPresets')}>
                    <div className="flex flex-wrap gap-1.5" role="list" aria-label={t('text.dummyPresets')}>
                      {PRESETS.map((preset, index) => (
                        <motion.button
                          key={preset.id}
                          type="button"
                          role="listitem"
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: ENTRANCE.duration,
                            delay: reduceMotion ? 0 : index * (STAGGER_SECTION_MS / 2),
                            ease: ENTRANCE.ease,
                          }}
                          className={cn(
                            'h-7 cursor-pointer rounded-full border bg-background px-3 text-xs font-medium shadow-xs',
                            'transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                          onClick={() => applyPreset(preset)}
                        >
                          {t(`text.dummyPreset.${preset.id}`)}
                        </motion.button>
                      ))}
                    </div>
                  </OptionField>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </FadeIn>

        <FadeIn delay={STAGGER_SECTION_MS} className="flex min-h-[320px] flex-1 flex-col gap-2">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{t('text.generatedText')}</h2>
              {stats ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {t('text.dummyStats', { words: stats.words, chars: stats.chars })}
                </span>
              ) : null}
            </div>
            {output ? <ToolActions value={output} onClear={() => setOutput('')} /> : null}
          </div>

          <AnimatePresence mode="wait">
            {output ? (
              <motion.div
                key={genTick}
                className="flex min-h-0 flex-1 flex-col"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: ENTRANCE.ease }}
              >
                <TextEditor
                  value={output}
                  readOnly
                  fill
                  mono={codeOutput}
                  language={editorLanguage}
                  ariaLabel={t('text.generatedText')}
                  className={cn(
                    'min-h-0 flex-1',
                    !codeOutput && 'px-4 py-3 text-[15px] leading-7 read-only:bg-card',
                  )}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 text-center"
              >
                <div className="flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <WandSparklesIcon className="size-5 text-primary" aria-hidden />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">{t('text.dummyEmpty')}</p>
                <Button size="sm" disabled={count === null} onClick={runGenerate} className="gap-1.5">
                  <SparklesIcon className="size-4" aria-hidden />
                  {t('text.generate')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </FadeIn>
      </div>
    </ToolPage>
  )
}

function OptionPair({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-6 gap-y-2.5 @[600px]:grid-cols-2">{children}</div>
}

function OptionField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5 @[440px]:grid-cols-[7rem_minmax(0,1fr)] @[440px]:items-center @[440px]:gap-3">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 font-normal text-muted-foreground/70 tabular-nums">({hint})</span> : null}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
