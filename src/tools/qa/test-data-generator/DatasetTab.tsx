import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ShuffleIcon, SparklesIcon } from 'lucide-react'

import {
  EXPORT_FORMATS,
  formatDataset,
  generateDataset,
  getFieldType,
  randomSeed,
  type DataRow,
  type ExportFormat,
  type ValueKind,
} from '@/core/engines/testdata'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Segmented } from '@/shared/components/ui/segmented'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { useElementWidth } from '@/shared/hooks/useElementWidth'
import { cn } from '@/shared/utils/cn'
import { ResultPanel } from './ResultPanel'
import { SchemaEditor, type Column } from './SchemaEditor'
import { columnsFromPreset, SCHEMA_PRESETS } from './presets'
import { downloadText, PREVIEW_LIMIT } from './shared'

/** Below this width the Build and Result views become switchable pages instead of side-by-side columns. */
const SPLIT_MIN_WIDTH = 880

export function DatasetTab() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [rootRef, width] = useElementWidth<HTMLDivElement>()
  const split = width >= SPLIT_MIN_WIDTH

  const [columns, setColumns] = useState<Column[]>(() => columnsFromPreset(SCHEMA_PRESETS[0].columns))
  const [countText, setCountText] = useState('25')
  const [seed, setSeed] = useState(() => randomSeed())
  const [nullPercent, setNullPercent] = useState(0)
  const [format, setFormat] = useState<ExportFormat>('json')
  const [includeSchema, setIncludeSchema] = useState(true)
  const [rows, setRows] = useState<DataRow[]>([])
  const [page, setPage] = useState<'build' | 'result'>('build')

  const count = parseNumberInRange(countText, 1, 10000)
  const canGenerate = columns.length > 0 && count !== null
  const hasNullable = columns.some((column) => column.nullable)
  const formatMeta = EXPORT_FORMATS.find((entry) => entry.id === format)!

  const exportOptions = useMemo(
    () => ({
      name: 'test_data',
      kinds: columns.map((column) => getFieldType(column.type)?.kind ?? 'text') as ValueKind[],
      includeSchema: includeSchema && format === 'sql',
    }),
    [columns, includeSchema, format],
  )

  const columnNames = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows])
  const preview = useMemo(
    () => (rows.length ? formatDataset(rows.slice(0, PREVIEW_LIMIT), columnNames, format, exportOptions) : ''),
    [rows, columnNames, format, exportOptions],
  )

  const generate = () => {
    if (!canGenerate) return
    setRows(generateDataset(columns, count, { seed, nullPercent }))
    setPage('result')
  }

  const fullText = () => formatDataset(rows, columnNames, format, exportOptions)
  const copy = async () => {
    await navigator.clipboard.writeText(fullText())
  }
  const download = () => downloadText(fullText(), `test-data-${seed}.${formatMeta.extension}`, formatMeta.mime)

  const build = (
    <div className="flex min-h-full flex-col gap-4">
      <SchemaEditor columns={columns} onChange={setColumns} />

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t('testData.controls.rows')}</Label>
            <NumberField
              value={countText}
              onChange={setCountText}
              min={1}
              max={10000}
              className="h-9"
              ariaLabel={t('testData.controls.rows')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t('testData.controls.seed')}</Label>
            <div className="flex gap-1.5">
              <Input
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                aria-label={t('testData.controls.seed')}
                className="h-9 min-w-0 flex-1 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSeed(randomSeed())}
                aria-label={t('testData.controls.reseed')}
                title={t('testData.controls.reseed')}
              >
                <ShuffleIcon />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">{t('testData.controls.format')}</Label>
          <ChoiceChips
            value={format}
            onValueChange={setFormat}
            ariaLabel={t('testData.controls.format')}
            options={EXPORT_FORMATS.map((entry) => ({ value: entry.id, label: entry.label }))}
          />
        </div>

        {format === 'sql' && (
          <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
            {t('testData.controls.schemaDdl')}
            <Switch checked={includeSchema} onCheckedChange={setIncludeSchema} />
          </label>
        )}

        {hasNullable && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t('testData.controls.nulls')}</Label>
              <span className="font-mono text-xs tabular-nums">{nullPercent}%</span>
            </div>
            <Slider
              value={[nullPercent]}
              onValueChange={([value]) => setNullPercent(value)}
              min={0}
              max={100}
              step={5}
              thumbLabel={t('testData.controls.nulls')}
              getValueText={(value) => `${value}%`}
            />
          </div>
        )}
      </section>

      <div className="sticky bottom-0 -mx-1 mt-auto bg-gradient-to-t from-background from-70% to-transparent px-1 pt-3 pb-1">
        <Button size="default" className="w-full" onClick={generate} disabled={!canGenerate}>
          <SparklesIcon />
          {t('testData.controls.generateSummary', {
            rows: count ?? 0,
            columns: columns.length,
            format: formatMeta.label,
          })}
        </Button>
      </div>
    </div>
  )

  const result = (
    <div className="flex min-h-full flex-col">
      <ResultPanel
        rows={rows}
        columns={columnNames}
        preview={preview}
        formatLabel={formatMeta.label}
        onCopy={copy}
        onDownload={download}
        onGenerate={generate}
        canGenerate={canGenerate}
      />
    </div>
  )

  if (split) {
    return (
      <div ref={rootRef} className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4">
        <div className="scrollbar-both min-h-0 overflow-y-auto pr-1">{build}</div>
        <div className="min-h-0 overflow-y-auto">{result}</div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col gap-3">
      <Segmented
        value={page}
        onValueChange={setPage}
        ariaLabel={t('testData.view.label')}
        className="w-full [&>button]:flex-1"
        options={[
          { value: 'build', label: t('testData.view.build') },
          {
            value: 'result',
            label: (
              <>
                {t('testData.view.result')}
                {rows.length > 0 && (
                  <span className="rounded-full bg-primary/15 px-1.5 text-[10px] leading-4 text-primary tabular-nums">
                    {rows.length}
                  </span>
                )}
              </>
            ),
          },
        ]}
      />
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={reduce ? false : { opacity: 0, x: page === 'result' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: page === 'result' ? -24 : 24 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className={cn('scrollbar-both absolute inset-0 overflow-y-auto', page === 'build' && 'pr-1')}
          >
            {page === 'build' ? build : result}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
