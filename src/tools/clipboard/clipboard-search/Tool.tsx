import { useMemo, useState } from 'react'
import { SearchIcon } from 'lucide-react'

import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useTransformTool } from '@/tools/text/_shared'
import { HistoryItem } from '../_HistoryItem'

export default function ClipboardSearchTool() {
  const tool = useTransformTool('clipboard.search')
  const { entries, refresh } = useClipboardHistory()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return entries.filter((entry) => entry.text.toLowerCase().includes(q))
  }, [entries, query])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search clipboard history…"
          ariaLabel="Search clipboard history"
        />
        {!query.trim() ? (
          <EmptyState
            icon={SearchIcon}
            title="Search your clipboard"
            description={`${entries.length} entries stored locally.`}
          />
        ) : results.length === 0 ? (
          <EmptyState icon={SearchIcon} title="No matches" />
        ) : (
          results.map((entry) => <HistoryItem key={entry.id} entry={entry} onChanged={refresh} />)
        )}
      </div>
    </ToolPage>
  )
}
