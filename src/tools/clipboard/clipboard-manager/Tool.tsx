import { useMemo, useState } from 'react'
import { HistoryIcon } from 'lucide-react'

import { captureClipboard } from '@/core/clipboard'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { ToolPage } from '@/shared/components/ToolPage'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useClipboardHistory } from '@/shared/hooks/useClipboardHistory'
import { useTransformTool } from '@/tools/text/_shared'
import { ClearHistoryButton, HistoryItem } from '../_HistoryItem'
import { useEffect } from 'react'

export default function ClipboardManagerTool() {
  const tool = useTransformTool('clipboard.manager')
  const { entries, refresh } = useClipboardHistory()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')

  useEffect(() => {
    void captureClipboard().then(refresh)
  }, [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (tab === 'pinned' && !entry.pinned) return false
      if (tab === 'text' && entry.pinned) return true
      if (q && !entry.text.toLowerCase().includes(q)) return false
      return true
    })
  }, [entries, query, tab])

  return (
    <ToolPage tool={tool} actions={<ClearHistoryButton onChanged={refresh} />}>
      <div className="flex flex-col gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search clipboard…" ariaLabel="Search clipboard" />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
          </TabsList>
        </Tabs>
        {filtered.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={entries.length === 0 ? 'Clipboard is empty' : 'No matches'}
            description={
              entries.length === 0
                ? 'Copied text appears here while the panel is open. Data never leaves this device.'
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
