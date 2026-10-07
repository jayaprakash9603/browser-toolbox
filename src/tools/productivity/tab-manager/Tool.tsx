import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyIcon, RefreshCwIcon, Trash2Icon, XIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { SearchInput } from '@/shared/components/SearchInput'
import { Badge } from '@/shared/components/ui/badge'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useProductivityTool } from '../_shared'

interface TabInfo {
  id: number
  title: string
  url: string
  active: boolean
}

export default function TabManagerTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.tab-manager')
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    try {
      const all = await chrome.tabs.query({})
      setTabs(all.filter((tab) => tab.id != null).map((tab) => ({ id: tab.id!, title: tab.title ?? tab.url ?? '', url: tab.url ?? '', active: tab.active })))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('tabs.loadError'))
    }
    setLoaded(true)
  }

  useEffect(() => {
    let live = true
    void chrome.tabs.query({}).then((all) => {
      if (live) setTabs(all.filter((tab) => tab.id != null).map((tab) => ({ id: tab.id!, title: tab.title ?? tab.url ?? '', url: tab.url ?? '', active: tab.active })))
    }).catch(() => undefined).finally(() => { if (live) setLoaded(true) })
    return () => { live = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? tabs.filter((tab) => tab.title.toLowerCase().includes(q) || tab.url.toLowerCase().includes(q)) : tabs
  }, [tabs, query])

  const duplicates = useMemo(() => {
    const seen = new Set<string>()
    return tabs.filter((tab) => { if (seen.has(tab.url)) return true; seen.add(tab.url); return false })
  }, [tabs])

  const closeTab = async (id: number) => { await chrome.tabs.remove(id); await load() }
  const closeDuplicates = async () => { await chrome.tabs.remove(duplicates.map((d) => d.id)); await load() }
  const copyUrls = () => void navigator.clipboard.writeText(tabs.map((tab) => tab.url).join('\n'))
  const focusTab = async (id: number) => { await chrome.tabs.update(id, { active: true }) }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <SearchInput value={query} onChange={setQuery} placeholder={t('tabs.search')} ariaLabel={t('tabs.search')} className="flex-1" />
          <Button size="icon-sm" variant="ghost" onClick={() => void load()} aria-label={t('common.tryAgain')}><RefreshCwIcon /></Button>
        </div>
        {error && <JsonErrorView message={error} />}
        {loaded && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="secondary">{tabs.length}</Badge>
            {duplicates.length > 0 && (
              <Button size="xs" variant="outline" onClick={() => void closeDuplicates()}>
                <Trash2Icon /> {t('tabs.closeDupes', { count: duplicates.length })}
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={copyUrls}><CopyIcon /> {t('tabs.copyUrls')}</Button>
          </div>
        )}
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {filtered.map((tab) => (
            <div key={tab.id} className={`flex items-center gap-1.5 rounded border p-1.5 ${tab.active ? 'border-primary/50' : ''}`}>
              <button type="button" onClick={() => void focusTab(tab.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[11px] font-medium">{tab.title}</p>
                <p className="truncate font-mono text-[9px] text-muted-foreground">{tab.url}</p>
              </button>
              <Button size="icon-xs" variant="ghost" onClick={() => void closeTab(tab.id)} aria-label={t('tabs.close')}><XIcon /></Button>
            </div>
          ))}
          {loaded && filtered.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">{t('common.noMatches')}</p>}
        </div>
      </div>
    </ToolPage>
  )
}
