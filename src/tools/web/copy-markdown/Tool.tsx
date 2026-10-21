import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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

  const capture = async (mode: 'selection' | 'article') => {
    const data = await sendToActiveTab<{ markdown: string }>({ type: 'GET_MARKDOWN_FROM_PAGE', mode })
    setMarkdown(data?.markdown ?? '')
  }

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
      <Textarea className="mt-3 font-mono text-xs" rows={14} value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
      <div className="mt-2">
        <CopyButton text={markdown} label={t('common.copy')} />
      </div>
    </ToolPage>
  )
}
