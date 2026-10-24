import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  EyeIcon,
  LoaderCircleIcon,
  Settings2Icon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'

import { DEFAULT_DOCUMENT_SETTINGS } from '@/core/engines/files/document'
import {
  DEFAULT_TARGETS,
  GROUP_TARGETS,
  TARGET_GROUPS,
  TARGET_META,
  extensionOf,
  groupOf,
  isSameFormat,
  type TargetFormat,
  type TargetGroup,
} from '@/core/engines/files/kinds'
import { formatBytes } from '@/core/engines/image'
import { FileDropZone, FileGlyph, PreviewDialog, type FileArtifact } from '@/shared/components/files'
import { Button } from '@/shared/components/ui/button'
import { Slider } from '@/shared/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import { DocumentSettingsForm, OptionField, OptionSelect, PanelSection } from './controls'
import { convertFile, type ConvertOptions } from './convert'
import { toQueueItems, type QueueItem } from './modes'

type JobResult = { status: 'running' } | { status: 'done'; artifact: FileArtifact } | { status: 'error'; error: string }
type Results = Record<string, Partial<Record<TargetFormat, JobResult>>>

const DEFAULT_OPTIONS: ConvertOptions = {
  document: DEFAULT_DOCUMENT_SETTINGS,
  imageQuality: 0.86,
  imageMaxEdge: 0,
  gzipLevel: 6,
}

const MAX_EDGES = ['0', '4096', '2560', '1920', '1280', '800'] as const
const GZIP_LEVELS = ['1', '6', '9', '0'] as const
const DROP_FORMATS = ['TXT', 'MD', 'CSV', 'JSON', 'YAML', 'XML', 'PNG', 'JPG', 'WEBP', 'SVG', 'GZ']

interface ConvertPanelProps {
  queue: QueueItem[]
  onQueueChange: (update: (queue: QueueItem[]) => QueueItem[]) => void
}

export function ConvertPanel({ queue, onQueueChange }: ConvertPanelProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [targets, setTargets] = useState<Record<TargetGroup, TargetFormat[]>>(DEFAULT_TARGETS)
  const [options, setOptions] = useState<ConvertOptions>(DEFAULT_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
  const [results, setResults] = useState<Results>({})
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [runSignature, setRunSignature] = useState<string | null>(null)
  const [preview, setPreview] = useState<number | null>(null)

  const running = progress !== null && progress.done < progress.total
  const signature = JSON.stringify([targets, options, queue.map((item) => item.id)])
  const stale = runSignature !== null && runSignature !== signature && !running

  const planned = (item: QueueItem) =>
    targets[groupOf(item.family)].filter((target) => !isSameFormat(item.file.name, item.family, target))

  const groups = useMemo(() => {
    const counts = new Map<TargetGroup, number>()
    for (const item of queue) counts.set(groupOf(item.family), (counts.get(groupOf(item.family)) ?? 0) + 1)
    return TARGET_GROUPS.filter((group) => counts.has(group)).map((group) => ({ group, count: counts.get(group) ?? 0 }))
  }, [queue])

  const jobs = queue.flatMap((item) => planned(item).map((target) => ({ item, target })))

  const artifacts = queue.flatMap((item) =>
    planned(item).flatMap((target) => {
      const result = results[item.id]?.[target]
      return result?.status === 'done' ? [result.artifact] : []
    }),
  )

  const selected = new Set(Object.values(targets).flat())
  const showDocOptions = groups.some(({ group }) => group === 'document' || (group === 'data' && targets.data.includes('pdf')))
  const showImageOptions =
    groups.some(({ group }) => group === 'image') && targets.image.some((target) => target === 'jpg' || target === 'webp' || target === 'png')
  const showGzipOptions = selected.has('gz')

  const setResult = (id: string, target: TargetFormat, result: JobResult) =>
    setResults((current) => ({ ...current, [id]: { ...current[id], [target]: result } }))

  const addFiles = (files: File[]) => onQueueChange((current) => [...current, ...toQueueItems(files)])

  const removeItem = (id: string) => {
    onQueueChange((current) => current.filter((item) => item.id !== id))
    setResults(({ [id]: _removed, ...rest }) => rest)
  }

  const toggleTarget = (group: TargetGroup, target: TargetFormat) =>
    setTargets((current) => {
      const list = current[group]
      const next = list.includes(target) ? list.filter((value) => value !== target) : [...list, target]
      return { ...current, [group]: GROUP_TARGETS[group].filter((value) => next.includes(value)) }
    })

  const run = async () => {
    if (!jobs.length || running) return
    setResults({})
    setProgress({ done: 0, total: jobs.length })
    let produced = 0
    for (const [index, { item, target }] of jobs.entries()) {
      setResult(item.id, target, { status: 'running' })
      try {
        const artifact = await convertFile(item.file, item.family, target, options)
        setResult(item.id, target, { status: 'done', artifact })
        produced += 1
      } catch (cause) {
        setResult(item.id, target, { status: 'error', error: cause instanceof Error ? cause.message : String(cause) })
      }
      setProgress({ done: index + 1, total: jobs.length })
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
    setRunSignature(signature)
    if (produced > 0) setPreview(0)
  }

  const clear = () => {
    onQueueChange(() => [])
    setResults({})
    setProgress(null)
    setRunSignature(null)
  }

  if (queue.length === 0) {
    return (
      <FileDropZone
        title={t('fs.convert.dropTitle')}
        hint={t('fs.convert.dropHint')}
        formats={DROP_FORMATS}
        glyphs={['CSV', 'PDF', 'XLSX']}
        multiple
        onFiles={addFiles}
      />
    )
  }

  const errors = Object.values(results).flatMap((entry) => Object.values(entry)).filter((result) => result?.status === 'error').length
  const percent = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0

  return (
    <div className="flex flex-col gap-3">
      <PanelSection
        title={t('fs.convert.formatsTitle')}
        icon={<SparklesIcon />}
        actions={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowOptions((value) => !value)}
            aria-expanded={showOptions}
            aria-controls="file-convert-options"
          >
            <Settings2Icon aria-hidden />
            {t('fs.convert.options')}
            <ChevronDownIcon className={cn('transition-transform duration-200', showOptions && 'rotate-180')} aria-hidden />
          </Button>
        }
      >
        <div className="flex flex-col gap-2.5">
          {groups.map(({ group, count }) => (
            <div key={group} className="flex flex-col gap-1.5 @[560px]:flex-row @[560px]:items-start @[560px]:gap-3">
              <p className="shrink-0 pt-1 text-xs font-medium @[560px]:w-32">
                {t(`fs.convert.group.${group}`)}
                <span className="ml-1 text-muted-foreground tabular-nums">· {count}</span>
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t(`fs.convert.group.${group}`)}>
                {GROUP_TARGETS[group].map((target) => {
                  const on = targets[group].includes(target)
                  return (
                    <button
                      key={target}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTarget(group, target)}
                      disabled={running}
                      className={cn(
                        'inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium outline-none transition-[background-color,border-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
                        on
                          ? 'border-primary/50 bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                      )}
                    >
                      {on && <CheckIcon className="size-3" aria-hidden />}
                      {TARGET_META[target].label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {showOptions && (
            <motion.div
              id="file-convert-options"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, transition: { duration: 0.12 } }}
              className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-3"
            >
              {showDocOptions && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold">{t('fs.convert.docOptions')}</p>
                  <DocumentSettingsForm
                    compact
                    value={options.document}
                    onChange={(document) => setOptions((current) => ({ ...current, document }))}
                  />
                </div>
              )}
              {showImageOptions && (
                <div className="grid gap-3 @[520px]:grid-cols-2">
                  <OptionField label={t('fs.convert.quality', { value: Math.round(options.imageQuality * 100) })}>
                    <Slider
                      min={50}
                      max={100}
                      step={1}
                      value={[Math.round(options.imageQuality * 100)]}
                      onValueChange={([value]) => setOptions((current) => ({ ...current, imageQuality: value / 100 }))}
                      thumbLabel={t('fs.convert.qualityLabel')}
                      className="h-8"
                    />
                  </OptionField>
                  <OptionSelect
                    label={t('fs.convert.maxEdge')}
                    value={String(options.imageMaxEdge) as (typeof MAX_EDGES)[number]}
                    onChange={(value) => setOptions((current) => ({ ...current, imageMaxEdge: Number(value) }))}
                    options={MAX_EDGES.map((edge) => ({
                      value: edge,
                      label: edge === '0' ? t('fs.convert.original') : `${edge} px`,
                    }))}
                  />
                </div>
              )}
              {showGzipOptions && (
                <OptionSelect
                  className="@[520px]:max-w-[50%]"
                  label={t('fs.convert.gzipLevel')}
                  value={String(options.gzipLevel) as (typeof GZIP_LEVELS)[number]}
                  onChange={(value) => setOptions((current) => ({ ...current, gzipLevel: Number(value) as ConvertOptions['gzipLevel'] }))}
                  options={GZIP_LEVELS.map((level) => ({ value: level, label: t(`fs.level.${level}`) }))}
                />
              )}
              {!showDocOptions && !showImageOptions && !showGzipOptions && (
                <p className="text-xs text-muted-foreground">{t('fs.convert.noOptions')}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PanelSection>

      <PanelSection
        title={t('fs.convert.queueTitle', { count: queue.length })}
        actions={
          <Button variant="ghost" size="xs" onClick={clear} disabled={running}>
            <Trash2Icon aria-hidden />
            {t('fs.clearAll')}
          </Button>
        }
      >
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {queue.map((item) => {
              const ext = extensionOf(item.file.name)
              const plan = planned(item)
              return (
                <motion.li
                  key={item.id}
                  layout={!reduce}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16, transition: { duration: 0.15 } }}
                  className="flex items-center gap-2.5 rounded-xl border bg-background/70 px-2.5 py-2"
                >
                  <FileGlyph extension={ext || 'bin'} className="h-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="mr-1 text-[11px] tabular-nums text-muted-foreground">{formatBytes(item.file.size)}</span>
                      {plan.length === 0 && <span className="text-[11px] text-muted-foreground">{t('fs.convert.nothing')}</span>}
                      {plan.map((target) => {
                        const result = results[item.id]?.[target]
                        const label = TARGET_META[target].label
                        if (result?.status === 'done') {
                          const index = artifacts.indexOf(result.artifact)
                          return (
                            <button
                              key={target}
                              type="button"
                              onClick={() => setPreview(index)}
                              aria-label={t('fs.convert.previewOutput', { format: label })}
                              className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[11px] font-semibold text-emerald-700 outline-none transition-colors hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-300"
                            >
                              <EyeIcon className="size-3" aria-hidden />
                              {label}
                              <span className="font-normal tabular-nums opacity-80">{formatBytes(result.artifact.blob.size)}</span>
                            </button>
                          )
                        }
                        if (result?.status === 'error') {
                          return (
                            <Tooltip key={target}>
                              <TooltipTrigger asChild>
                                <span
                                  tabIndex={0}
                                  className="inline-flex h-6 items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 text-[11px] font-semibold text-destructive outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <CircleAlertIcon className="size-3" aria-hidden />
                                  {label}
                                  <span className="sr-only">: {result.error}</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-72">{result.error}</TooltipContent>
                            </Tooltip>
                          )
                        }
                        return (
                          <span
                            key={target}
                            className={cn(
                              'inline-flex h-6 items-center gap-1 rounded-md border border-dashed px-1.5 text-[11px] font-medium text-muted-foreground',
                              result?.status === 'running' && 'border-solid border-primary/40 text-primary',
                            )}
                          >
                            {result?.status === 'running' && <LoaderCircleIcon className="size-3 animate-spin" aria-hidden />}
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeItem(item.id)}
                    disabled={running}
                    aria-label={t('fs.removeFile', { name: item.file.name })}
                  >
                    <XIcon />
                  </Button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
        <FileDropZone compact multiple title={t('fs.addMore')} onFiles={addFiles} />
      </PanelSection>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-2xl border bg-background/90 p-2.5 shadow-lg backdrop-blur-md">
        {progress && (
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--hero-from)] to-[var(--hero-to)]"
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{ duration: reduce ? 0 : 0.3 }}
              />
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {running
                ? t('fs.convert.progress', { done: progress.done, total: progress.total })
                : [t('fs.convert.finished', { count: artifacts.length }), errors ? t('fs.convert.failed', { count: errors }) : '']
                    .filter(Boolean)
                    .join(' · ')}
            </span>
          </div>
        )}
        {stale && <p className="text-[11px] text-amber-700 dark:text-amber-300">{t('fs.convert.stale')}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void run()} disabled={running || jobs.length === 0} className="min-w-40 flex-1 @[480px]:flex-none">
            {running ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <SparklesIcon aria-hidden />}
            {running ? t('fs.convert.running') : t('fs.convert.run', { count: jobs.length })}
          </Button>
          {artifacts.length > 0 && !running && (
            <Button variant="outline" onClick={() => setPreview(0)}>
              <EyeIcon aria-hidden />
              {t('fs.convert.previewAll', { count: artifacts.length })}
            </Button>
          )}
        </div>
      </div>

      <PreviewDialog artifacts={artifacts} index={preview} onIndexChange={setPreview} zipName="converted-files.zip" />
    </div>
  )
}
