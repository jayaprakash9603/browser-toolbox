import { useState } from 'react'
import { ArrowLeftRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { useTransformTool } from '../_shared'
import { compareText, type DiffResult } from '@/core/engines/diff'

export default function TextDiffTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.diff')
  const [inputA, setInputA] = useState('')
  const [inputB, setInputB] = useState('')
  const [result, setResult] = useState<DiffResult | null>(null)

  const compare = () => setResult(compareText(inputA, inputB, 'lines'))
  const swap = () => {
    setInputA(inputB)
    setInputB(inputA)
    setResult(null)
  }
  const clear = () => {
    setInputA('')
    setInputB('')
    setResult(null)
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex gap-1.5">
          <Button size="sm" onClick={compare} disabled={!inputA && !inputB}>
            {t('text.compare')}
          </Button>
          <Button size="sm" variant="outline" onClick={swap}>
            <ArrowLeftRightIcon /> {t('text.swap')}
          </Button>
          <Button size="sm" variant="ghost" onClick={clear}>
            {t('common.clear')}
          </Button>
        </div>

        <TextPaneGrid>
          <div className="flex min-h-0 flex-col">
            <p className="mb-1 shrink-0 text-xs font-medium">{t('text.inputA')}</p>
            <TextEditor value={inputA} onChange={setInputA} ariaLabel={t('text.inputA')} fill />
          </div>
          <div className="flex min-h-0 flex-col">
            <p className="mb-1 shrink-0 text-xs font-medium">{t('text.inputB')}</p>
            <TextEditor value={inputB} onChange={setInputB} ariaLabel={t('text.inputB')} fill />
          </div>
        </TextPaneGrid>

        {result && (
          <div className="max-h-40 shrink-0 overflow-y-auto">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Badge variant="secondary">+{result.added}</Badge>
              <Badge variant="secondary">-{result.removed}</Badge>
              <Badge variant="outline">{t('text.unchanged', { count: result.unchanged })}</Badge>
            </div>
            <div
              className="rounded-md border font-mono text-[11px] leading-relaxed"
              aria-label={t('text.diffResult')}
            >
              {result.changes.map((change, index) => (
                <pre
                  key={index}
                  className={
                    change.added
                      ? 'bg-green-500/15 px-2 py-0.5 whitespace-pre-wrap text-green-700 dark:text-green-400'
                      : change.removed
                        ? 'bg-red-500/15 px-2 py-0.5 whitespace-pre-wrap text-red-700 dark:text-red-400'
                        : 'px-2 py-0.5 whitespace-pre-wrap text-muted-foreground'
                  }
                >
                  {change.added ? '+ ' : change.removed ? '- ' : '  '}
                  {change.value.replace(/\n$/, '')}
                </pre>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
