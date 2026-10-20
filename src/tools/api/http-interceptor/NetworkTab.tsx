import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InterceptorState, NetLogEntry } from '@/core/interceptor'
import { entryToCurl, entryToFetch } from '@/features/interceptor/curl'
import { entriesToHar } from '@/features/interceptor/har'
import { useInterceptorLog } from '@/features/interceptor/hooks'
import { newRuleId, upsertRule } from '@/core/interceptor'
import { eventBus } from '@/core/events'
import { stashPayload } from '@/core/payloads'
import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CodeEditor } from '@/shared/components/CodeEditor'

interface Props {
  state: InterceptorState
  tabId?: number
  devtoolsBodies?: Map<string, string>
}

export function NetworkTab({ tabId, devtoolsBodies }: Props) {
  const { t } = useTranslation()
  const { entries: live, clear } = useInterceptorLog(tabId)
  const [filter, setFilter] = useState('')
  const [onlyModified, setOnlyModified] = useState(false)
  const [selected, setSelected] = useState<NetLogEntry | null>(null)
  const [activeTabId, setActiveTabId] = useState<number | undefined>(tabId)

  useEffect(() => {
    if (tabId != null) {
      setActiveTabId(tabId)
      return
    }
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id != null) setActiveTabId(tab.id)
    })
  }, [tabId])

  const entries = useMemo(() => {
    let list = live
    if (onlyModified) list = list.filter((e) => e.modified)
    const q = filter.trim().toLowerCase()
    if (q) list = list.filter((e) => e.url.toLowerCase().includes(q))
    return [...list].reverse()
  }, [live, filter, onlyModified])

  const responseText =
    selected &&
    (selected.responseBody ??
      devtoolsBodies?.get(selected.url) ??
      (selected.status ? `Status ${selected.status}` : ''))

  const attachDeep = () => {
    if (activeTabId == null) return
    void sendMessage({ type: 'INTERCEPTOR_DEEP_ATTACH', tabId: activeTabId })
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('interceptor.limitation')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('interceptor.network.search')}
          className="max-w-xs text-xs"
        />
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={onlyModified} onCheckedChange={setOnlyModified} />
          {t('interceptor.network.onlyModified')}
        </label>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          {t('interceptor.network.clear')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={attachDeep}>
          Deep attach
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const blob = new Blob([entriesToHar(live)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'interceptor.har'
            a.click()
          }}
        >
          HAR
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('interceptor.network.empty')}</p>
      ) : (
        <div className="grid gap-2 @[560px]:grid-cols-2">
          <ul className="max-h-[480px] overflow-y-auto rounded-lg border text-xs">
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-0.5 border-b px-2 py-1.5 text-left hover:bg-muted ${selected?.id === e.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelected(e)}
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{e.method}</Badge>
                    <span className="text-muted-foreground">{e.status ?? '…'}</span>
                    {e.modified && <Badge className="text-[10px]">Rule</Badge>}
                  </span>
                  <span className="truncate font-mono">{e.url}</span>
                </button>
              </li>
            ))}
          </ul>
          {selected && (
            <div className="rounded-lg border p-2">
              <Tabs defaultValue="headers">
                <TabsList>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                </TabsList>
                <TabsContent value="headers" className="max-h-64 overflow-auto font-mono text-[10px]">
                  <pre>{JSON.stringify(selected.requestHeaders, null, 2)}</pre>
                  <pre>{JSON.stringify(selected.responseHeaders, null, 2)}</pre>
                </TabsContent>
                <TabsContent value="response">
                  <CodeEditor value={String(responseText ?? '')} readOnly className="min-h-[200px]" />
                  <div className="mt-2 flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(entryToCurl(selected))}>
                      cURL
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(entryToFetch(selected))}>
                      fetch
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void upsertRule({
                          id: newRuleId(),
                          name: `Mock ${selected.url.slice(0, 40)}`,
                          enabled: true,
                          groupId: 'default',
                          priority: 10,
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                          type: 'mockApi',
                          source: { field: 'url', operator: 'contains', value: selected.url },
                          status: selected.status ?? 200,
                          bodySource: 'static',
                          body: String(responseText ?? '{}'),
                          contentType: 'application/json',
                        })
                      }}
                    >
                      Mock
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void stashPayload({ toolId: 'api.request-builder', linkUrl: selected.url }).then(() => {
                          eventBus.emit('OPEN_TOOL', { toolId: 'api.request-builder' })
                        })
                      }}
                    >
                      API client
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="rules" className="text-xs">
                  {selected.appliedRuleIds.length
                    ? selected.appliedRuleIds.map((id) => <div key={id}>{id}</div>)
                    : 'No rules matched'}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
