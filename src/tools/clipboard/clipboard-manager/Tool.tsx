import { useEffect, useMemo, useState } from 'react'
import { HistoryIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { captureClipboard } from '@/core/clipboard'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useTransformTool } from '@/tools/text/_shared'
import { ClearHistoryButton, HistoryItem } from '../_HistoryItem'

export default function ClipboardManagerTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('clipboard.manager')
  const { entries, refresh } = useClipboardHistory()
  const [query, setQuery] = useState('')

  useEffect(() => {
    void captureClipboard().then(refresh)
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => !q || entry.text.toLowerCase().includes(q))
  }, [entries, query])

  return (
    <ToolPage tool={tool} actions={<ClearHistoryButton onChanged={refresh} />}>
      <div className="flex flex-col gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('clipboard.search')} ariaLabel={t('clipboard.searchLabel')} />
        {filtered.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={entries.length === 0 ? t('clipboard.empty') : t('common.noMatches')}
            description={
              entries.length === 0
                ? t('clipboard.emptyDescription')
                : undefined
            }
          />
        ) : (
          filtered.map((entry) => <HistoryItem key={entry.id} entry={entry} onChanged={refresh} />)
        )}
      </div>
    </ToolPage>
  )
}
