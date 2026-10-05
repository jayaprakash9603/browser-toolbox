import { useEffect } from 'react'
import { ClipboardPasteIcon, HistoryIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { captureClipboard, readClipboardText } from '@/core/clipboard'
import { EmptyState } from '@/shared/components/EmptyState'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useTransformTool } from '@/tools/text/_shared'
import { ClearHistoryButton, HistoryItem } from '../_HistoryItem'

export default function ClipboardHistoryTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('clipboard.history')
  const { entries, refresh } = useClipboardHistory()

  useEffect(() => {
    const capture = () => void captureClipboard().then(refresh)
    capture()
    window.addEventListener('focus', capture)
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain')
      if (text) void import('@/core/clipboard').then((m) => m.addClipboardEntry(text).then(refresh))
    }
    document.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('focus', capture)
      document.removeEventListener('paste', onPaste)
    }
  }, [refresh])

  const addNow = async () => {
    const text = await readClipboardText().catch(() => '')
    if (text) {
      const { addClipboardEntry } = await import('@/core/clipboard')
      await addClipboardEntry(text)
    }
    await refresh()
  }

  return (
    <ToolPage
      tool={tool}
      actions={<ClearHistoryButton onChanged={refresh} />}
    >
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="outline" onClick={() => void addNow()}>
          <ClipboardPasteIcon /> {t('clipboard.addCurrent')}
        </Button>
        {entries.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={t('clipboard.noEntries')}
            description={t('clipboard.noEntriesDescription')}
          />
        ) : (
          entries.map((entry) => <HistoryItem key={entry.id} entry={entry} onChanged={refresh} />)
        )}
      </div>
    </ToolPage>
  )
}
