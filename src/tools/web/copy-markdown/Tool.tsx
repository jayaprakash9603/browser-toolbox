import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { subscribePayload } from '@/core/payloads'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { CopyButton } from '@/shared/components/CopyButton'
import { useWebTool } from '../_shared'
import { sendToActiveTab } from '../tabMessaging'

export default function CopyMarkdownTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.copy-markdown')
  const [markdown, setMarkdown] = useState('')
  const [emptySelection, setEmptySelection] = useState(false)

  const capture = async (mode: 'selection' | 'article', fallbackText = '') => {
    const data = await sendToActiveTab<{ markdown: string }>({ type: 'GET_MARKDOWN_FROM_PAGE', mode })
    const converted = data?.markdown?.trim() ? data.markdown : fallbackText
    setMarkdown(converted)
    setEmptySelection(mode === 'selection' && !converted.trim())
  }

  useEffect(
    () => subscribePayload(tool.id, (payload) => void capture('selection', payload.text ?? '')),
    [tool.id],
  )

  return (
    <ToolPage tool={tool}>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => void capture('selection')}>
          {t('web.copyMarkdown.selection')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void capture('article')}>
          {t('web.copyMarkdown.article')}
        </Button>
      </div>
      {emptySelection && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {t('web.copyMarkdown.emptySelection', {
            defaultValue: 'Nothing is selected on the page. Select some text and try again.',
          })}
        </p>
      )}
      <Textarea className="mt-3 font-mono text-xs" rows={14} value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
      <div className="mt-2">
        <CopyButton text={markdown} label={t('common.copy')} />
      </div>
    </ToolPage>
  )
}
