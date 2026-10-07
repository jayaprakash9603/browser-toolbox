import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { toUserMessage } from '@/core/errors'
import { ErrorState } from '@/shared/components/ErrorState'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
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
  const [lastSearch, setLastSearch] = useState(search)
  const detectedFormat = useMemo(() => detectTextFormat(input), [input])
  const activeFormat = formatSelection === 'auto' ? detectedFormat : formatSelection
  const formatter = getTextFormatter(activeFormat)

  if (search !== lastSearch) {
    setLastSearch(search)
    setFormatSelection(getTextFormatSelection(search))
  }

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
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Button size="sm" onClick={() => run('format')} disabled={!input.trim()}>
            {t('text.beautify')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => run('minify')} disabled={!input.trim()}>
            {t('text.minify')}
          </Button>
        </div>

        <TextPaneGrid split={Boolean(output && !error)}>
          <div className="flex min-h-0 flex-col">
            <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t(formatSelection === 'auto' ? 'text.detectedFormat' : 'text.selectedFormat')}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={formatter.badgeClassName} aria-live="polite">
                {t(formatter.labelKey)}
              </Badge>
              <Select
                value={formatSelection}
                onValueChange={(value) => setFormatSelection(value as TextFormatSelection)}
              >
                <SelectTrigger
                  aria-label={t('text.formatSelection')}
                  size="sm"
                  className="w-28"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="auto">{t('text.format.auto')}</SelectItem>
                  {TEXT_FORMAT_IDS.map((format) => (
                    <SelectItem key={format} value={format}>{t(`text.format.${format}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            <TextEditor
              value={input}
              onChange={setInput}
              placeholder={t('text.pasteOrType')}
              ariaLabel={t('text.input')}
              onKeyCommand={() => run('format')}
              fill
            />
            <StatsBar value={input} />
            <ToolActions value={input} onClear={() => { setInput(''); setOutput('') }} />
          </div>
          {output && !error && (
            <div className="flex min-h-0 flex-col">
              <div className="mb-1 flex shrink-0 items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
              </div>
              <TextEditor value={output} readOnly ariaLabel={t('text.output')} fill />
            </div>
          )}
        </TextPaneGrid>
        {error && <ErrorState message={error} />}
      </div>
    </ToolPage>
  )
}
