import { useState } from 'react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { useTranslation } from 'react-i18next'

import {
  addLineNumbers,
  removeDuplicateLines,
  removeEmptyLines,
  removeLineNumbers,
  reverseLines,
  shuffleLines,
  sortLines,
  SORT_MODES,
  type SortMode,
} from '@/core/engines/text'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { OutputPane } from '@/tools/developer/_shared'
import { useTransformTool } from '../_shared'

type LineOp = 'dedupe' | 'sort' | 'reverse' | 'shuffle' | 'numbering' | 'empty'

interface LineToolResult {
  output: string
  summary?: string
}

export default function LineToolsTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.line-tools')
  const [op, setOp] = useDeepLinkTab(
    'tab',
    ['dedupe', 'sort', 'reverse', 'shuffle', 'numbering', 'empty'] as const,
    'dedupe',
  )
  const [input, setInput] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [trimFirst, setTrimFirst] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('alpha-asc')
  const [numberMode, setNumberMode] = useState<'add' | 'remove'>('add')
  const [startAtText, setStartAtText] = useState('1')
  const startAt = parseNumberInRange(startAtText, 0)
  const [result, setResult] = useState<LineToolResult | null>(null)

  const run = () => {
    if (!input) return
    switch (op) {
      case 'dedupe': {
        const dedupe = removeDuplicateLines(input, { caseSensitive, trimFirst })
        setResult({
          output: dedupe.output,
          summary: t('text.removedCount', { count: dedupe.removedCount }),
        })
        break
      }
      case 'sort':
        setResult({ output: sortLines(input, sortMode, caseSensitive) })
        break
      case 'reverse':
        setResult({ output: reverseLines(input) })
        break
      case 'shuffle':
        setResult({ output: shuffleLines(input) })
        break
      case 'numbering':
        setResult({
          output:
            numberMode === 'add'
              ? addLineNumbers(input, { startAt: startAt ?? 1 })
              : removeLineNumbers(input),
        })
        break
      case 'empty':
        setResult({ output: removeEmptyLines(input) })
        break
    }
  }

  const runSort = (mode: SortMode) => {
    setSortMode(mode)
    if (input) setResult({ output: sortLines(input, mode, caseSensitive) })
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={op} onValueChange={(value) => setOp(value as LineOp)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="dedupe">{t('text.tabDedupe')}</TabsTrigger>
            <TabsTrigger value="sort">{t('text.tabSort')}</TabsTrigger>
            <TabsTrigger value="reverse">{t('text.tabReverse')}</TabsTrigger>
            <TabsTrigger value="shuffle">{t('text.tabShuffle')}</TabsTrigger>
            <TabsTrigger value="numbering">{t('text.tabNumbering')}</TabsTrigger>
            <TabsTrigger value="empty">{t('text.tabRemoveEmpty')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {(op === 'dedupe' || op === 'sort') && (
          <label className="flex w-fit items-center gap-2 text-xs">
            <Switch
              checked={caseSensitive}
              onCheckedChange={setCaseSensitive}
              aria-label={t('text.caseSensitiveLabel')}
            />
            {t('text.caseSensitive')}
          </label>
        )}
        {op === 'dedupe' && (
          <label className="flex w-fit items-center gap-2 text-xs">
            <Switch
              checked={trimFirst}
              onCheckedChange={setTrimFirst}
              aria-label={t('text.trimBeforeComparisonLabel')}
            />
            {t('text.trimBeforeCompare')}
          </label>
        )}
        {op === 'sort' && (
          <div className="grid grid-cols-2 gap-1.5 @[380px]:grid-cols-3">
            {SORT_MODES.map((mode) => (
              <Button
                key={mode.id}
                type="button"
                size="sm"
                variant={sortMode === mode.id ? 'secondary' : 'outline'}
                aria-pressed={sortMode === mode.id}
                onClick={() => runSort(mode.id)}
                disabled={!input}
              >
                {t(
                  `sort.${mode.id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`,
                  {
                    defaultValue: mode.label,
                  },
                )}
              </Button>
            ))}
          </div>
        )}
        {op === 'numbering' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={numberMode === 'add' ? 'secondary' : 'outline'}
                aria-pressed={numberMode === 'add'}
                onClick={() => setNumberMode('add')}
              >
                {t('text.numbersAdd')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={numberMode === 'remove' ? 'secondary' : 'outline'}
                aria-pressed={numberMode === 'remove'}
                onClick={() => setNumberMode('remove')}
              >
                {t('text.numbersRemove')}
              </Button>
            </div>
            {numberMode === 'add' && (
              <label className="flex items-center gap-2 text-xs">
                {t('text.startAt')}
                <NumberField
                  value={startAtText}
                  onChange={setStartAtText}
                  min={0}
                  className="w-20"
                  ariaLabel={t('text.startAt')}
                />
              </label>
            )}
          </div>
        )}
        {op !== 'sort' && (
          <Button
            size="sm"
            className="w-fit"
            onClick={run}
            disabled={!input || (op === 'numbering' && numberMode === 'add' && startAt === null)}
          >
            {t('text.apply')}
          </Button>
        )}

        <TextPaneGrid split={Boolean(result)}>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={'apple\nbanana\napple\norange'}
            ariaLabel={t('text.linesInput')}
            label={t('common.input')}
            onKeyCommand={run}
            fill
          />
          {result && (
            <OutputPane
              value={result.output}
              error={null}
              label={result.summary ? `${t('text.output')} · ${result.summary}` : t('text.output')}
              onClear={() => setResult(null)}
              fill
            />
          )}
        </TextPaneGrid>
      </div>
    </ToolPage>
  )
}
