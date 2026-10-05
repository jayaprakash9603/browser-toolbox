import { PinIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/shared/components/EmptyState'
import { ToolPage } from '@/shared/components/ToolPage'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useTransformTool } from '@/tools/text/_shared'
import { HistoryItem } from '../_HistoryItem'

export default function ClipboardPinnedTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('clipboard.pinned')
  const { entries, refresh } = useClipboardHistory()
  const pinned = entries.filter((entry) => entry.pinned)

  return (
    <ToolPage tool={tool}>
      {pinned.length === 0 ? (
        <EmptyState
          icon={PinIcon}
          title={t('clipboard.noPinned')}
          description={t('clipboard.noPinnedDescription')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {pinned.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} onChanged={refresh} />
          ))}
        </div>
      )}
    </ToolPage>
  )
}
