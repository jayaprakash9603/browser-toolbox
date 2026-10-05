import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toUserMessage } from '@/core/errors'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { ErrorState } from '@/shared/components/ErrorState'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import { formatMarkdown } from './logic'

export default function MarkdownFormatterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.markdown-formatter')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const format = () => {
    try {
      setOutput(formatMarkdown(input))
      setError(null)
    } catch (err) {
      setError(toUserMessage(err, t('errors.formatContent')))
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={'#Heading\n* item\n\n\n\n1)first'}
            ariaLabel={t('text.markdownInput')}
            onKeyCommand={format}
          />
          <StatsBar value={input} />
        </div>
        <Button size="sm" onClick={format} disabled={!input.trim()}>
          {t('text.formatMarkdown')}
        </Button>
        {error && <ErrorState message={error} />}
        {output && !error && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('text.formatted')}</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly ariaLabel={t('text.formattedOutput')} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
