import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { SearchInput } from '@/shared/components/SearchInput'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { useStorageTool } from '../_shared'
import type { StorageSnapshot } from '@/chrome/content/index'

export default function StorageInspectorTool() {
  const { t } = useTranslation()
  const tool = useStorageTool('storage.inspector')
  const [snapshot, setSnapshot] = useState<StorageSnapshot | null>(null)
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = async (): Promise<StorageSnapshot | null> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id == null) return null
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STORAGE_SNAPSHOT' })
      return (response?.data ?? response) as StorageSnapshot
    } catch {
      return null
    }
  }

  useEffect(() => {
    let live = true
    void load().then((value) => { if (live) setSnapshot(value) }).finally(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [])

  const refresh = () => { void load().then(setSnapshot) }

  const filter = (record: Record<string, string>) => {
    const q = query.trim().toLowerCase()
    return Object.entries(record).filter(([key, value]) => !q || key.toLowerCase().includes(q) || value.toLowerCase().includes(q))
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <SearchInput value={query} onChange={setQuery} placeholder={t('common.searchPlaceholder')} ariaLabel={t('common.search')} className="flex-1" />
          <Button size="icon-sm" variant="ghost" onClick={refresh} aria-label={t('common.tryAgain')}><RefreshCwIcon /></Button>
        </div>
        {!loaded ? <p className="text-xs text-muted-foreground">{t('nav.loading')}</p> : !snapshot ? (
          <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">{t('storage.noAccess')}</p>
        ) : (
          <Tabs defaultValue="local">
            <TabsList>
              <TabsTrigger value="local">localStorage <Badge variant="outline" className="ml-1 text-[8px]">{Object.keys(snapshot.localStorage).length}</Badge></TabsTrigger>
              <TabsTrigger value="session">sessionStorage <Badge variant="outline" className="ml-1 text-[8px]">{Object.keys(snapshot.sessionStorage).length}</Badge></TabsTrigger>
            </TabsList>
            {(['local', 'session'] as const).map((which) => (
              <TabsContent key={which} value={which} className="mt-2">
                <StorageTable entries={filter(which === 'local' ? snapshot.localStorage : snapshot.sessionStorage)} emptyLabel={t('storage.empty')} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </ToolPage>
  )
}

function StorageTable({ entries, emptyLabel }: { entries: [string, string][]; emptyLabel: string }) {
  if (entries.length === 0) return <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
  return (
    <div className="max-h-96 space-y-1 overflow-y-auto">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded border p-1.5">
          <div className="flex items-center justify-between gap-1">
            <code className="min-w-0 truncate font-mono text-[10px] font-medium text-primary">{key}</code>
            <CopyButton text={value} />
          </div>
          <code className="mt-0.5 block break-all font-mono text-[10px] text-muted-foreground">{value.length > 200 ? `${value.slice(0, 200)}…` : value}</code>
        </div>
      ))}
    </div>
  )
}
