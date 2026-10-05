import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import { removeDuplicateLines, type DedupeResult } from './logic'

export default function DuplicateLineRemoverTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.duplicate-line-remover')
  const [input, setInput] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [trimFirst, setTrimFirst] = useState(true)
  const [result, setResult] = useState<DedupeResult | null>(null)

  const run = () => setResult(removeDuplicateLines(input, { caseSensitive, trimFirst }))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={'apple\nbanana\napple\norange'}
            ariaLabel={t('text.linesInput')}
            onKeyCommand={run}
          />
          <StatsBar value={input} />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={caseSensitive} onCheckedChange={setCaseSensitive} aria-label={t('text.caseSensitiveLabel')} />
            {t('text.caseSensitive')}
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={trimFirst} onCheckedChange={setTrimFirst} aria-label={t('text.trimBeforeComparisonLabel')} />
            {t('text.trimBeforeCompare')}
          </label>
        </div>

        <Button size="sm" onClick={run} disabled={!input}>
          {t('text.removeDuplicates')}
        </Button>

        {result && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">
                {t('text.output')}{' '}
                <span className="text-muted-foreground">{t('text.removedCount', { count: result.removedCount })}</span>
              </span>
              <ToolActions value={result.output} onClear={() => setResult(null)} />
            </div>
            <TextEditor value={result.output} readOnly ariaLabel={t('text.deduplicated')} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
