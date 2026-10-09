import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRouter } from '@/app/router'
import { toUserMessage } from '@/core/errors'
import { ErrorState } from '@/shared/components/ErrorState'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { OutputPane } from '@/tools/developer/_shared'
import { useTransformTool } from '../_shared'
import { FormatLanguageSelect } from './FormatLanguageSelect'
import {
  detectTextFormat,
  formatText,
  getTextFormatSelection,
  minifyText,
} from './logic'
import type { TextFormatSelection } from './formatters/types'

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

  if (search !== lastSearch) {
    setLastSearch(search)
    setFormatSelection(getTextFormatSelection(search))
  }

  const run = (action: 'format' | 'minify') => {
    try {
      setOutput(
        action === 'format' ? formatText(input, activeFormat) : minifyText(input, activeFormat),
      )
      setError(null)
    } catch (cause) {
      setOutput('')
      setError(toUserMessage(cause, t('errors.formatContent')))
    }
  }

  const editorActions = (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <Button
        size="sm"
        className="h-7 shrink-0 px-2.5 text-xs"
        onClick={() => run('format')}
        disabled={!input.trim()}
      >
        {t('text.beautify')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 shrink-0 px-2.5 text-xs"
        onClick={() => run('minify')}
        disabled={!input.trim()}
      >
        {t('text.minify')}
      </Button>
      <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-border @[360px]:block" aria-hidden />
      <FormatLanguageSelect
        value={formatSelection}
        detectedFormat={detectedFormat}
        onValueChange={(value) => setFormatSelection(value as TextFormatSelection)}
      />
    </div>
  )

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <TextPaneGrid split={Boolean(output && !error)}>
          <TextEditor
            value={input}
            onChange={(value) => {
              setInput(value)
              if (!value) setOutput('')
            }}
            placeholder={t('text.pasteOrType')}
            ariaLabel={t('text.input')}
            label={t('common.input')}
            onKeyCommand={() => run('format')}
            fill
            actions={editorActions}
          />
          {output && !error && (
            <OutputPane value={output} error={null} onClear={() => setOutput('')} fill />
          )}
        </TextPaneGrid>
        {error && <ErrorState message={error} />}
      </div>
    </ToolPage>
  )
}
