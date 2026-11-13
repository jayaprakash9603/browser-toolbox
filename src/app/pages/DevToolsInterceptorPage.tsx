import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIcon, FolderIcon, GaugeIcon, ListIcon, RadarIcon, SendIcon, SettingsIcon } from 'lucide-react'

import { classifyCapture, endpointId } from '@/core/interceptor/apiFinder'
import { sendMessage } from '@/core/messaging'
import { ApiWorkspaceProvider, useApiWorkspace } from '@/features/interceptor/ApiWorkspaceContext'
import { useInterceptorLog, useInterceptorState } from '@/features/interceptor/hooks'
import { fromHar, fromNetLog, rowToCapture, type NetworkRow } from '@/features/interceptor/networkModel'
import type { InterceptorTab } from '@/features/interceptor/routes'
import { CollectionsTab } from '@/tools/api/http-interceptor/CollectionsTab'
import { ExplorerTab } from '@/tools/api/http-interceptor/ExplorerTab'
import { FinderTab } from '@/tools/api/http-interceptor/FinderTab'
import { NetworkInspector } from '@/tools/api/http-interceptor/NetworkInspector'
import { RulesTab } from '@/tools/api/http-interceptor/RulesTab'
import { SettingsTab } from '@/tools/api/http-interceptor/SettingsTab'
import { cn } from '@/shared/utils/cn'

import '@/tools/api/http-interceptor/i18n'

type View = 'network' | 'executions' | 'finder' | 'explorer' | 'collections' | 'rules' | 'settings'

const NAV: { id: View; label: string; icon: typeof ActivityIcon }[] = [
  { id: 'network', label: 'Network Traffic', icon: GaugeIcon },
  { id: 'finder', label: 'API Finder', icon: RadarIcon },
  { id: 'explorer', label: 'API Explorer', icon: SendIcon },
  { id: 'collections', label: 'Collections', icon: FolderIcon },
  { id: 'executions', label: 'Rule Executions', icon: ActivityIcon },
  { id: 'rules', label: 'Rules', icon: ListIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function DevToolsInterceptorPage() {
  const tabId = chrome.devtools?.inspectedWindow?.tabId
  const { state, setState, patchSettings } = useInterceptorState()
  const { entries: logEntries, clear: clearLog } = useInterceptorLog(tabId)
  const [view, setView] = useState<View>('network')
  const [harRows, setHarRows] = useState<NetworkRow[]>([])
  const [preserve, setPreserve] = useState(false)
  const [deepActive, setDeepActive] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)
  const preserveRef = useRef(preserve)
  const counter = useRef(0)

  useEffect(() => {
    preserveRef.current = preserve
  }, [preserve])

  useEffect(() => {
    const net = chrome.devtools?.network
    if (!net) return
    net.getHAR((log) => {
      setHarRows(log.entries.map((e, i) => fromHar(e as never, i)))
      counter.current = log.entries.length
    })
    const onFinished = (request: chrome.devtools.network.Request) => {
      const row = fromHar(request as never, counter.current++)
      setHarRows((prev) => [...prev, row].slice(-3000))
    }
    const onNavigated = () => {
      if (!preserveRef.current) {
        setHarRows([])
        counter.current = 0
      }
    }
    net.onRequestFinished.addListener(onFinished)
    net.onNavigated.addListener(onNavigated)
    return () => {
      net.onRequestFinished.removeListener(onFinished)
      net.onNavigated.removeListener(onNavigated)
    }
  }, [])

  const logByUrl = useMemo(() => {
    const map = new Map<string, (typeof logEntries)[number]>()
    for (const e of logEntries) if (e.modified) map.set(e.url, e)
    return map
  }, [logEntries])

  const networkRows = useMemo(
    () =>
      harRows.map((r) => {
        const log = logByUrl.get(r.url)
        if (!log) return r
        return {
          ...r,
          modified: true,
          appliedRuleIds: log.appliedRuleIds,
          ruleHits: log.ruleHits,
          effectiveUrl: log.effectiveUrl,
          status: log.status ?? r.status,
        }
      }),
    [harRows, logByUrl],
  )

  const executionRows = useMemo(() => logEntries.filter((e) => e.modified).map(fromNetLog), [logEntries])
  const currentHost = useMemo(() => {
    try {
      return networkRows[0] ? new URL(networkRows[0].url).host : undefined
    } catch {
      return undefined
    }
  }, [networkRows])

  const toggleDeep = useCallback(async () => {
    if (tabId == null) return
    if (deepActive) {
      await sendMessage({ type: 'INTERCEPTOR_DEEP_DETACH', tabId })
      setDeepActive(false)
      return
    }
    const error = await sendMessage<string | null>({ type: 'INTERCEPTOR_DEEP_ATTACH', tabId })
    setDeepError(error ?? null)
    setDeepActive(!error)
  }, [deepActive, tabId])

  const clearAll = () => {
    setHarRows([])
    counter.current = 0
    clearLog()
  }

  const openTab = (tab: InterceptorTab) => {
    if (tab === 'network') setView('network')
    else if (tab === 'finder') setView('finder')
    else if (tab === 'explorer') setView('explorer')
    else if (tab === 'collections') setView('collections')
    else if (tab === 'rules') setView('rules')
    else if (tab === 'settings') setView('settings')
    else if (tab === 'library') setView('network')
  }

  return (
    <ApiWorkspaceProvider
      rows={networkRows}
      currentHost={currentHost}
      includeSecrets={Boolean(state?.settings.includeSecretsInCopy)}
      onOpenTab={openTab}
    >
      <div className="flex h-full min-h-0">
        <nav className="w-40 shrink-0 border-r bg-muted/30 py-2 text-xs">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted',
                view === id && 'bg-primary/10 font-medium text-primary',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </nav>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {view === 'network' && (
            <DevToolsNetwork
              rows={networkRows}
              onClear={clearAll}
              preserve={preserve}
              onPreserve={setPreserve}
              deep={{ active: deepActive, onToggle: () => void toggleDeep(), error: deepError }}
            />
          )}
          {view === 'executions' && (
            <NetworkInspector
              rows={executionRows}
              onClear={clearLog}
              preserveLog={preserve}
              onPreserveLogChange={setPreserve}
            />
          )}
          {view === 'finder' && (
            <div className="@container h-full overflow-y-auto p-3">
              <div className="mx-auto flex max-w-5xl min-h-0 gap-4 max-[720px]:flex-col">
                <div className="min-w-0 flex-1">
                  <FinderTab />
                </div>
              </div>
            </div>
          )}
          {view === 'explorer' && (
            <div className="@container h-full overflow-y-auto p-3">
              <div className="mx-auto grid min-h-0 max-w-6xl gap-3 @[900px]:grid-cols-[minmax(0,1fr)]">
                <ExplorerTab />
              </div>
            </div>
          )}
          {view === 'collections' && (
            <div className="h-full overflow-y-auto p-3">
              <CollectionsTab />
            </div>
          )}
          {view === 'rules' && state && (
            <div className="h-full overflow-y-auto p-3">
              <RulesTab state={state} onStateChange={setState} embedded />
            </div>
          )}
          {view === 'settings' && state && (
            <div className="h-full overflow-y-auto p-3">
              <SettingsTab state={state} patchSettings={patchSettings} />
            </div>
          )}
        </div>
      </div>
    </ApiWorkspaceProvider>
  )
}

function DevToolsNetwork({
  rows,
  onClear,
  preserve,
  onPreserve,
  deep,
}: {
  rows: NetworkRow[]
  onClear: () => void
  preserve: boolean
  onPreserve: (value: boolean) => void
  deep: { active: boolean; onToggle: () => void; error?: string | null }
}) {
  const { openFinder, openExplorerFromRow } = useApiWorkspace()
  return (
    <NetworkInspector
      rows={rows}
      onClear={onClear}
      preserveLog={preserve}
      onPreserveLogChange={onPreserve}
      deep={deep}
      onFindApi={(row) => {
        const classified = classifyCapture(rowToCapture(row))
        if (classified) {
          openFinder(
            endpointId(row.method, classified.origin, classified.routeTemplate, classified.graphql?.operationName),
          )
        }
      }}
      onTestApi={openExplorerFromRow}
    />
  )
}
