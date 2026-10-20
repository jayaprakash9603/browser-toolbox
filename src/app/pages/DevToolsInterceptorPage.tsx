import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIcon, GaugeIcon, ListIcon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { useInterceptorLog, useInterceptorState } from '@/features/interceptor/hooks'
import { fromHar, fromNetLog, type NetworkRow } from '@/features/interceptor/networkModel'
import { NetworkInspector } from '@/tools/api/http-interceptor/NetworkInspector'
import { RulesTab } from '@/tools/api/http-interceptor/RulesTab'
import { cn } from '@/shared/utils/cn'

type View = 'network' | 'executions' | 'rules'

const NAV: { id: View; label: string; icon: typeof ActivityIcon }[] = [
  { id: 'network', label: 'Network Traffic', icon: GaugeIcon },
  { id: 'executions', label: 'Rule Executions', icon: ActivityIcon },
  { id: 'rules', label: 'Rules', icon: ListIcon },
]

export default function DevToolsInterceptorPage() {
  const tabId = chrome.devtools?.inspectedWindow?.tabId
  const { state, setState } = useInterceptorState()
  const { entries: logEntries, clear: clearLog } = useInterceptorLog(tabId)
  const [view, setView] = useState<View>('network')
  const [harRows, setHarRows] = useState<NetworkRow[]>([])
  const [preserve, setPreserve] = useState(false)
  const [deepActive, setDeepActive] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)
  const preserveRef = useRef(preserve)
  preserveRef.current = preserve
  const counter = useRef(0)

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

  const modifiedUrls = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of logEntries) if (e.modified) map.set(e.url, e.appliedRuleIds)
    return map
  }, [logEntries])

  const networkRows = useMemo(
    () =>
      harRows.map((r) => {
        const ids = modifiedUrls.get(r.url)
        return ids ? { ...r, modified: true, appliedRuleIds: ids } : r
      }),
    [harRows, modifiedUrls],
  )

  const executionRows = useMemo(() => logEntries.filter((e) => e.modified).map(fromNetLog), [logEntries])

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

  return (
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
          <NetworkInspector
            rows={networkRows}
            onClear={clearAll}
            preserveLog={preserve}
            onPreserveLogChange={setPreserve}
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
        {view === 'rules' && state && (
          <div className="h-full overflow-y-auto p-3">
            <RulesTab state={state} onStateChange={setState} />
          </div>
        )}
      </div>
    </div>
  )
}
