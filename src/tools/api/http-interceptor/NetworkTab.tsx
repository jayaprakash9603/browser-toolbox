import { useApiWorkspace } from '@/features/interceptor/ApiWorkspaceContext'
import { classifyCapture, endpointId } from '@/core/interceptor/apiFinder'
import { rowToCapture, type NetworkRow } from '@/features/interceptor/networkModel'

import { NetworkInspector } from './NetworkInspector'

interface Props {
  rows: NetworkRow[]
  onClear: () => void
  capturePaused: boolean
  onCapturePausedChange: (paused: boolean) => void
  includeSecrets: boolean
}

export function NetworkTab({ rows, onClear, capturePaused, onCapturePausedChange, includeSecrets }: Props) {
  const { openFinder, openExplorerFromRow } = useApiWorkspace()

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border">
      <NetworkInspector
        rows={rows}
        onClear={onClear}
        preserveLog
        onPreserveLogChange={() => undefined}
        showPreserveLog={false}
        capturePaused={capturePaused}
        onCapturePausedChange={onCapturePausedChange}
        includeSecrets={includeSecrets}
        onFindApi={(row) => {
          const classified = classifyCapture(rowToCapture(row))
          if (classified) {
            openFinder(endpointId(row.method, classified.origin, classified.routeTemplate, classified.graphql?.operationName))
          } else {
            openFinder('')
          }
        }}
        onTestApi={openExplorerFromRow}
      />
    </div>
  )
}
