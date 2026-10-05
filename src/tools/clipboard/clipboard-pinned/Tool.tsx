import { PinIcon } from 'lucide-react'

import { EmptyState } from '@/shared/components/EmptyState'
import { ToolPage } from '@/shared/components/ToolPage'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useTransformTool } from '@/tools/text/_shared'
import { HistoryItem } from '../_HistoryItem'

export default function ClipboardPinnedTool() {
  const tool = useTransformTool('clipboard.pinned')
  const { entries, refresh } = useClipboardHistory()
  const pinned = entries.filter((entry) => entry.pinned)

  return (
    <ToolPage tool={tool}>
      {pinned.length === 0 ? (
        <EmptyState
          icon={PinIcon}
          title="No pinned items"
          description="Pin clipboard entries from Clipboard History to keep them here."
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
