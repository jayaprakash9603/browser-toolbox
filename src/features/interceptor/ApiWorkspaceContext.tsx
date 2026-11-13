import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { draftFromCapture } from '@/core/interceptor/apiExplorer'
import type { ApiEndpoint, ApiFinderStats, ExplorerDraft } from '@/core/interceptor/apiFinderTypes'
import type { InterceptorTab } from '@/features/interceptor/routes'
import { useApiEndpoints } from '@/features/interceptor/useApiEndpoints'
import { rowToCapture, type NetworkRow } from '@/features/interceptor/networkModel'

interface ApiWorkspaceValue {
  rows: NetworkRow[]
  rowById: Map<string, NetworkRow>
  endpoints: ApiEndpoint[]
  stats: ApiFinderStats
  selectedEndpointId: string | null
  setSelectedEndpointId: (id: string | null) => void
  draft: ExplorerDraft | null
  setDraft: (draft: ExplorerDraft | null) => void
  currentHost?: string
  includeSecrets: boolean
  openFinder: (endpointId: string) => void
  openExplorerFromRow: (row: NetworkRow) => void
  openExplorerFromEndpoint: (endpoint: ApiEndpoint) => void
  openExplorerDraft: (draft: ExplorerDraft) => void
}

const Ctx = createContext<ApiWorkspaceValue | null>(null)

export function ApiWorkspaceProvider({
  rows,
  currentHost,
  includeSecrets,
  onOpenTab,
  children,
}: {
  rows: NetworkRow[]
  currentHost?: string
  includeSecrets: boolean
  onOpenTab: (tab: InterceptorTab) => void
  children: ReactNode
}) {
  const { endpoints, stats } = useApiEndpoints(rows)
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ExplorerDraft | null>(null)
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])

  const openFinder = useCallback(
    (endpointId: string) => {
      setSelectedEndpointId(endpointId)
      onOpenTab('finder')
    },
    [onOpenTab],
  )

  const openExplorerFromRow = useCallback(
    (row: NetworkRow) => {
      setDraft(draftFromCapture(rowToCapture(row), `${row.method} ${row.url}`))
      onOpenTab('explorer')
    },
    [onOpenTab],
  )

  const openExplorerFromEndpoint = useCallback(
    (endpoint: ApiEndpoint) => {
      const row = rowById.get(endpoint.sampleOccurrenceId)
      if (row) {
        openExplorerFromRow(row)
        return
      }
      setDraft(
        draftFromCapture({
          id: endpoint.sampleOccurrenceId,
          method: endpoint.method,
          url: endpoint.lastUrl,
          status: endpoint.lastStatus,
        }),
      )
      onOpenTab('explorer')
    },
    [onOpenTab, openExplorerFromRow, rowById],
  )

  const openExplorerDraft = useCallback(
    (next: ExplorerDraft) => {
      setDraft(next)
      onOpenTab('explorer')
    },
    [onOpenTab],
  )

  const value = useMemo<ApiWorkspaceValue>(
    () => ({
      rows,
      rowById,
      endpoints,
      stats,
      selectedEndpointId,
      setSelectedEndpointId,
      draft,
      setDraft,
      currentHost,
      includeSecrets,
      openFinder,
      openExplorerFromRow,
      openExplorerFromEndpoint,
      openExplorerDraft,
    }),
    [
      currentHost,
      draft,
      endpoints,
      includeSecrets,
      openExplorerDraft,
      openExplorerFromEndpoint,
      openExplorerFromRow,
      openFinder,
      rowById,
      rows,
      selectedEndpointId,
      stats,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApiWorkspace(): ApiWorkspaceValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useApiWorkspace requires ApiWorkspaceProvider')
  return value
}
