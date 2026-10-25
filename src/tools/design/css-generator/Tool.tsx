import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { ChevronsUpDownIcon, Grid2x2Icon, HistoryIcon, MoonIcon, PauseIcon, PlayIcon, RotateCcwIcon, SunIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { addClipboardEntry } from '@/core/clipboard'
import { ChipRail } from '@/shared/components/ChipRail'
import { CopyButton } from '@/shared/components/CopyButton'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'
import { useDesignTool } from '../_shared'
import { GENERATORS, GENERATOR_BY_ID, GROUPS, type GeneratorDef } from './catalog'
import { Section } from './fields'
import { GENERATOR_IDS, OUTPUT_FORMATS, formatResult, presetMatches, type GeneratorId, type OutputFormat } from './generators'
import { Preview } from './Preview'
import { STAGE_STYLES, type Stage } from './stage'

type States = Record<GeneratorId, unknown>

const initialStates = (): States => Object.fromEntries(GENERATORS.map((g) => [g.id, g.defaults])) as States

function GeneratorPicker({ value, onChange }: { value: GeneratorDef; onChange: (id: GeneratorId) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const Icon = value.icon
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 min-w-0 flex-1 justify-start gap-2.5 px-2.5" aria-label={t('css.chooseGenerator')}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span className="truncate text-[13px] font-semibold">{t(`css.gen.${value.id}`)}</span>
            <span className="truncate text-[11px] font-normal text-muted-foreground">{t(`css.group.${value.group}`)}</span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,var(--radix-popover-trigger-width))] p-2">
        <div className="flex flex-col gap-2">
          {GROUPS.map((group) => (
            <div key={group} role="group" aria-label={t(`css.group.${group}`)}>
              <p className="px-1.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t(`css.group.${group}`)}</p>
              <div className="grid grid-cols-2 gap-1">
                {GENERATORS.filter((g) => g.group === group).map((g) => {
                  const ItemIcon = g.icon
                  const selected = g.id === value.id
                  return (
                    <Button
                      key={g.id}
                      variant="ghost"
                      size="sm"
                      aria-pressed={selected}
                      onClick={() => {
                        onChange(g.id)
                        setOpen(false)
                      }}
                      className={cn('justify-start gap-2 px-2 font-medium', selected && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
                    >
                      <ItemIcon className="size-4 shrink-0" />
                      <span className="truncate">{t(`css.gen.${g.id}`)}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CodeView({ code, format }: { code: string; format: OutputFormat }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
      <code>
        {code.split('\n').map((line, index, lines) => {
          const decl = format !== 'tailwind' && /^(\s+)([-A-Za-z]+)(:\s)(.*)$/.exec(line)
          return (
            <span key={index}>
              {line.startsWith('/*') ? (
                <span className="text-muted-foreground italic">{line}</span>
              ) : decl ? (
                <>
                  {decl[1]}
                  <span className="text-sky-700 dark:text-sky-300">{decl[2]}</span>
                  {decl[3]}
                  <span className="text-foreground">{decl[4]}</span>
                </>
              ) : (
                <span className={cn(format !== 'tailwind' && /^(\.|@|\}|const )/.test(line) && 'text-violet-700 dark:text-violet-300')}>{line}</span>
              )}
              {index < lines.length - 1 && '\n'}
            </span>
          )
        })}
      </code>
    </pre>
  )
}

export default function CssGeneratorTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.css-generator')
  const reduceMotion = useReducedMotion()
  const [id, setId] = useDeepLinkTab('tab', GENERATOR_IDS, 'gradient')
  const [states, setStates] = useState<States>(initialStates)
  const [format, setFormat] = useState<OutputFormat>('css')
  const [stage, setStage] = useState<Stage>('light')
  const [playKey, setPlayKey] = useState(0)
  const [playing, setPlaying] = useState(!reduceMotion)

  const generator = GENERATOR_BY_ID[id]
  const state = states[id]
  const result = generator.build(state)
  const code = formatResult(result, format)
  const { Editor } = generator

  const patch = (next: object) => setStates((current) => ({ ...current, [id]: { ...(current[id] as object), ...next } }))
  const reset = () => setStates((current) => ({ ...current, [id]: generator.defaults }))

  return (
    <ToolPage tool={tool}>
      <div className="@container flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <GeneratorPicker value={generator} onChange={setId} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="size-10" onClick={reset} aria-label={t('css.action.reset')}>
                <RotateCcwIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('css.action.reset')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 gap-3 @[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @[720px]:items-start">
          <div className="order-2 flex min-w-0 flex-col gap-3 @[720px]:col-start-1 @[720px]:row-start-1">
            <Section title={t('css.section.presets')}>
              <ChipRail role="group" label={t('css.section.presets')}>
                {generator.presets.map((preset) => {
                  const applied = { ...(state as object), ...(preset.patch as object) }
                  const active = presetMatches(state as object, preset.patch as object)
                  return (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="xs"
                      aria-pressed={active}
                      onClick={() => patch(preset.patch)}
                      className={cn('shrink-0 gap-1.5 rounded-full pl-1.5', !generator.swatch && 'pl-2.5', active && 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
                    >
                      {generator.swatch && (
                        <span aria-hidden className="size-4 shrink-0 rounded-full bg-white" style={generator.swatch(applied)} />
                      )}
                      {t(`css.preset.${preset.id}`)}
                    </Button>
                  )
                })}
              </ChipRail>
            </Section>
            <Editor key={id} value={state} onChange={patch} />
          </div>

          <div className="contents @[720px]:sticky @[720px]:top-[calc(var(--density-page-pad)*-1)] @[720px]:col-start-2 @[720px]:row-start-1 @[720px]:flex @[720px]:flex-col @[720px]:gap-3 @[720px]:pt-2 @[720px]:-mt-2">
            <div className="sticky top-[calc(var(--density-page-pad)*-1)] z-10 order-1 -mx-[var(--density-page-pad)] -mt-2 bg-background/95 px-[var(--density-page-pad)] pt-2 pb-1 backdrop-blur-md @[720px]:static @[720px]:m-0 @[720px]:bg-transparent @[720px]:p-0 @[720px]:backdrop-blur-none">
              <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
                  <Segmented
                    size="sm"
                    ariaLabel={t('css.stage.label')}
                    value={stage}
                    onValueChange={setStage}
                    options={[
                      { value: 'light', title: t('css.stage.light'), label: <><SunIcon /><span className="sr-only">{t('css.stage.light')}</span></> },
                      { value: 'dark', title: t('css.stage.dark'), label: <><MoonIcon /><span className="sr-only">{t('css.stage.dark')}</span></> },
                      { value: 'checker', title: t('css.stage.checker'), label: <><Grid2x2Icon /><span className="sr-only">{t('css.stage.checker')}</span></> },
                    ]}
                  />
                  {id === 'animation' ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t('css.action.pause') : t('css.action.play')}>
                        {playing ? <PauseIcon /> : <PlayIcon />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setPlaying(true)
                          setPlayKey((k) => k + 1)
                        }}
                      >
                        <RotateCcwIcon /> {t('css.action.replay')}
                      </Button>
                    </div>
                  ) : (
                    <span className="truncate text-[11px] font-medium text-muted-foreground">{t('css.livePreview')}</span>
                  )}
                </div>
                <div
                  className="relative isolate flex h-40 items-center justify-center overflow-hidden @[720px]:h-72"
                  style={STAGE_STYLES[stage]}
                >
                  <Preview id={id} state={state} result={result} stage={stage} playKey={playKey} playing={playing} />
                </div>
              </div>
            </div>

            <Section
              className="order-3"
              title={t('css.section.code')}
              action={
                <div className="flex items-center gap-0.5">
                  <CopyButton text={code} size="xs" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-xs" onClick={() => void addClipboardEntry(code)} aria-label={t('text.saveHistory')}>
                        <HistoryIcon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('text.saveHistory')}</TooltipContent>
                  </Tooltip>
                </div>
              }
            >
              <Segmented
                size="sm"
                ariaLabel={t('css.format.label')}
                value={format}
                onValueChange={setFormat}
                options={OUTPUT_FORMATS.map((f) => ({ value: f, label: t(`css.format.${f}`) }))}
                className="w-full [&>button]:flex-1"
              />
              <CodeView code={code} format={format} />
            </Section>
          </div>
        </div>
      </div>
    </ToolPage>
  )
}
