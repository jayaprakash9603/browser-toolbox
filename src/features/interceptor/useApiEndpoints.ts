import { useMemo } from 'react'

import { aggregateEndpoints, finderStats, matchesFinderFilter, matchesFinderQuery } from '@/core/interceptor/apiFinder'
import type { ApiEndpoint, ApiFinderFilter } from '@/core/interceptor/apiFinderTypes'
import { rowToCapture, type NetworkRow } from '@/features/interceptor/networkModel'

export function useApiEndpoints(rows: NetworkRow[]) {
  const endpoints = useMemo(() => aggregateEndpoints(rows.map(rowToCapture)), [rows])
  const stats = useMemo(() => finderStats(endpoints), [endpoints])
  return { endpoints, stats }
}

export function filterEndpoints(
  endpoints: ApiEndpoint[],
  query: string,
  filters: Set<ApiFinderFilter>,
  currentHost?: string,
): ApiEndpoint[] {
  return endpoints.filter(
    (endpoint) => matchesFinderFilter(endpoint, filters, currentHost) && matchesFinderQuery(endpoint, query),
  )
}
