import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { toUserMessage } from '@/core/errors'
import { ErrorState } from '@/shared/components/ErrorState'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import {
  detectTextFormat,
  formatText,
  getTextFormatSelection,
  getTextFormatter,
  minifyText,
} from './logic'
import { TEXT_FORMAT_IDS, type TextFormatSelection } from './formatters/types'

export default function TextFormatterTool() {
  const { t } = useTranslation()
  const { search } = useRouter()
  const tool = useTransformTool('text.formatter')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formatSelection, setFormatSelection] = useState(() => getTextFormatSelection(search))
  const detectedFormat = useMemo(() => detectTextFormat(input), [input])
  const activeFormat = formatSelection === 'auto' ? detectedFormat : formatSelection
  const formatter = getTextFormatter(activeFormat)

  useEffect(() => {
    setFormatSelection(getTextFormatSelection(search))
  }, [search])

  const run = (action: 'format' | 'minify') => {
    try {
      setOutput(action === 'format'
        ? formatText(input, activeFormat)
        : minifyText(input, activeFormat))
      setError(null)
    } catch (cause) {
      setOutput('')
      setError(toUserMessage(cause, t('errors.formatContent')))
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t(formatSelection === 'auto' ? 'text.detectedFormat' : 'text.selectedFormat')}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={formatter.badgeClassName} aria-live="polite">
                {t(formatter.labelKey)}
              </Badge>
              <select
                aria-label={t('text.formatSelection')}
                className="h-6 max-w-36 rounded-md border border-input bg-background px-1.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formatSelection}
                onChange={(event) => setFormatSelection(event.currentTarget.value as TextFormatSelection)}
              >
                <option value="auto">{t('text.format.auto')}</option>
                {TEXT_FORMAT_IDS.map((format) => (
                  <option key={format} value={format}>{t(`text.format.${format}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('text.pasteOrType')}
            ariaLabel={t('text.input')}
            onKeyCommand={() => run('format')}
          />
          <StatsBar value={input} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => run('format')} disabled={!input.trim()}>
            {t('text.beautify')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => run('minify')} disabled={!input.trim()}>
            {t('text.minify')}
          </Button>
        </div>

        {error && <ErrorState message={error} />}
        {output && !error && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly ariaLabel={t('text.output')} />
          </div>
        )}

        <ToolActions value={input} onClear={() => { setInput(''); setOutput('') }} />
      </div>
    </ToolPage>
  )
}
