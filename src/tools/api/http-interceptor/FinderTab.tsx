import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ActivityIcon,
  GlobeIcon,
  SearchIcon,
  ServerCrashIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import { API_FINDER_FILTERS, type ApiEndpoint, type ApiFinderFilter } from '@/core/interceptor/apiFinderTypes'
import { parseGraphqlBody } from '@/core/interceptor/graphql'
import { pathParamsFromTemplate } from '@/core/interceptor/apiFinder'
import { formatRelativeTime } from '@/app/pages/home/formatRelativeTime'
import { useApiWorkspace } from '@/features/interceptor/ApiWorkspaceContext'
import { filterEndpoints } from '@/features/interceptor/useApiEndpoints'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import { CopyMenu } from './CopyMenu'
import { GraphqlPanel } from './GraphqlPanel'
import { JsonViewer } from './JsonViewer'
import { kindBadgeClass, MethodBadge, statusBadgeClass } from './MethodBadge'

const STAT_CARDS = [
  { key: 'endpoints', icon: ActivityIcon, tone: 'text-sky-700 dark:text-sky-300' },
  { key: 'uniqueRoutes', icon: SearchIcon, tone: 'text-violet-700 dark:text-violet-300' },
  { key: 'getCount', icon: ActivityIcon, tone: 'text-sky-700 dark:text-sky-300' },
  { key: 'postCount', icon: ActivityIcon, tone: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'errorCount', icon: ServerCrashIcon, tone: 'text-red-700 dark:text-red-300' },
  { key: 'domains', icon: GlobeIcon, tone: 'text-muted-foreground' },
] as const

export function FinderTab() {
  const { t } = useTranslation()
  const {
    endpoints,
    stats,
    selectedEndpointId,
    setSelectedEndpointId,
    openExplorerFromEndpoint,
    rowById,
    currentHost,
    includeSecrets,
    rows,
  } = useApiWorkspace()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Set<ApiFinderFilter>>(new Set())
  const visible = useMemo(
    () => filterEndpoints(endpoints, query, filters, currentHost),
    [currentHost, endpoints, filters, query],
  )
  const selected = endpoints.find((item) => item.id === selectedEndpointId) ?? null

  const toggle = (id: ApiFinderFilter) => {
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 @[420px]:grid-cols-3">
        {STAT_CARDS.map(({ key, icon: Icon, tone }) => (
          <div key={key} className="rounded-lg border bg-card px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Icon className={cn('size-3.5', tone)} aria-hidden />
              {t(`interceptor.finder.stat.${key}`)}
            </div>
            <p className={cn('mt-1 text-lg font-semibold tabular-nums', tone)}>{stats[key]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('interceptor.finder.search')}
          className="h-8 text-xs"
        />
        <div className="flex flex-wrap gap-1">
          {API_FINDER_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted',
                filters.has(id) && 'border-primary/40 bg-primary/10 font-medium text-primary',
              )}
            >
              {t(`interceptor.finder.filter.${id}`)}
            </button>
          ))}
          {filters.size > 0 && (
            <button type="button" className="px-2 text-[11px] text-muted-foreground" onClick={() => setFilters(new Set())}>
              {t('interceptor.finder.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('interceptor.finder.emptyTitle')} body={t('interceptor.finder.emptyBody')} />
      ) : visible.length === 0 ? (
        <EmptyState title={t('interceptor.finder.noResults')} body={t('interceptor.finder.noResultsBody')} />
      ) : (
        <EndpointList
          endpoints={visible}
          selectedId={selectedEndpointId}
          onSelect={setSelectedEndpointId}
          onTest={openExplorerFromEndpoint}
        />
      )}

      {selected && (
        <EndpointDetail
          endpoint={selected}
          includeSecrets={includeSecrets}
          rowById={rowById}
          onTest={() => openExplorerFromEndpoint(selected)}
          onClose={() => setSelectedEndpointId(null)}
        />
      )}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-8 text-center">
      <TriangleAlertIcon className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  )
}

function EndpointList({
  endpoints,
  selectedId,
  onSelect,
  onTest,
}: {
  endpoints: ApiEndpoint[]
  selectedId: string | null
  onSelect: (id: string) => void
  onTest: (endpoint: ApiEndpoint) => void
}) {
  const { t } = useTranslation()
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: endpoints.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  })
  const useVirtual = endpoints.length >= 80

  const renderRow = (endpoint: ApiEndpoint) => (
    <button
      type="button"
      onClick={() => onSelect(endpoint.id)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border px-2.5 py-2 text-left hover:bg-muted/60',
        selectedId === endpoint.id && 'border-primary/40 bg-primary/5',
      )}
    >
      <div className="flex items-center gap-2">
        <MethodBadge method={endpoint.method} />
        <span className="min-w-0 truncate font-mono text-[12px]">{endpoint.routeTemplate}</span>
        <span className={cn('ml-auto font-mono text-[11px]', statusBadgeClass(endpoint.lastStatus))}>
          {endpoint.lastStatus ?? '—'}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className={kindBadgeClass(endpoint.kind)}>{endpoint.kind}</span>
        <span>{endpoint.host}</span>
        <span>
          {endpoint.callCount} {t('interceptor.finder.calls')}
        </span>
        <span className="ml-auto">{formatRelativeTime(endpoint.lastSeen)}</span>
        <span
          role="link"
          tabIndex={0}
          className="text-primary"
          onClick={(event) => {
            event.stopPropagation()
            onTest(endpoint)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.stopPropagation()
              onTest(endpoint)
            }
          }}
        >
          {t('interceptor.finder.test')}
        </span>
      </div>
    </button>
  )

  if (!useVirtual) {
    return <div className="flex flex-col gap-1.5">{endpoints.map((endpoint) => <div key={endpoint.id}>{renderRow(endpoint)}</div>)}</div>
  }

  return (
    <div ref={parentRef} className="max-h-[420px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={endpoints[item.index].id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
            className="pb-1.5"
          >
            {renderRow(endpoints[item.index])}
          </div>
        ))}
      </div>
    </div>
  )
}

function EndpointDetail({
  endpoint,
  includeSecrets,
  rowById,
  onTest,
  onClose,
}: {
  endpoint: ApiEndpoint
  includeSecrets: boolean
  rowById: Map<string, import('@/features/interceptor/networkModel').NetworkRow>
  onTest: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const row = rowById.get(endpoint.sampleOccurrenceId)
  const [bodyState, setBodyState] = useState<{ rowId: string; text: string } | null>(null)
  const body = row && bodyState?.rowId === row.id ? bodyState.text : null
  const gql = parseGraphqlBody(row?.postData)

  useEffect(() => {
    if (!row?.getBody) return
    let cancelled = false
    void row.getBody().then((content) => {
      if (!cancelled) setBodyState({ rowId: row.id, text: content })
    })
    return () => {
      cancelled = true
    }
  }, [row])

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MethodBadge method={endpoint.method} />
            <span className="truncate font-mono text-xs">{endpoint.routeTemplate}</span>
          </div>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{endpoint.lastUrl}</p>
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={onClose}>
          {t('interceptor.finder.close')}
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-muted-foreground">{t('interceptor.finder.domain')}</dt>
        <dd>{endpoint.host}</dd>
        <dt className="text-muted-foreground">{t('interceptor.finder.type')}</dt>
        <dd className={kindBadgeClass(endpoint.kind)}>{endpoint.kind}</dd>
        <dt className="text-muted-foreground">{t('interceptor.finder.status')}</dt>
        <dd className={statusBadgeClass(endpoint.lastStatus)}>{endpoint.lastStatus ?? '—'}</dd>
        <dt className="text-muted-foreground">{t('interceptor.finder.calls')}</dt>
        <dd>{endpoint.callCount}</dd>
        <dt className="text-muted-foreground">{t('interceptor.finder.duration')}</dt>
        <dd>{endpoint.lastDurationMs != null ? `${endpoint.lastDurationMs} ms` : '—'}</dd>
        <dt className="text-muted-foreground">{t('interceptor.finder.firstSeen')}</dt>
        <dd>{formatRelativeTime(endpoint.firstSeen)}</dd>
        <dt className="text-muted-foreground">{t('interceptor.finder.lastSeen')}</dt>
        <dd>{formatRelativeTime(endpoint.lastSeen)}</dd>
      </dl>
      {row && (
        <CopyMenu
          includeSecrets={includeSecrets}
          responseBody={body ?? undefined}
          request={{
            method: row.method,
            url: row.url,
            requestHeaders: row.requestHeaders,
            requestBody: row.postData,
            responseHeaders: row.responseHeaders,
            status: row.status,
          }}
        />
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="xs" onClick={onTest}>
          {t('interceptor.finder.test')}
        </Button>
        {row && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void navigator.clipboard.writeText(row.url)}
          >
            {t('interceptor.copy.url')}
          </Button>
        )}
      </div>
      {gql && (
        <GraphqlPanel
          meta={{
            query: gql.query,
            operationName: gql.operationName,
            variables: gql.variables,
          }}
        />
      )}
      {row && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold">{t('interceptor.finder.request')}</h4>
          <HeaderList title={t('interceptor.finder.reqHeaders')} headers={row.requestHeaders} />
          {row.queryParams.length > 0 && <HeaderList title={t('interceptor.finder.params')} headers={row.queryParams.map((p) => ({ name: p.name, value: p.value }))} />}
          {(() => {
            try {
              const params = pathParamsFromTemplate(endpoint.routeTemplate, new URL(endpoint.lastUrl).pathname)
              return params.length ? (
                <HeaderList
                  title={t('interceptor.finder.pathParams')}
                  headers={params.map((p) => ({ name: p.name, value: p.value }))}
                />
              ) : null
            } catch {
              return null
            }
          })()}
          {row.postData && <JsonViewer value={row.postData} />}
        </section>
      )}
      <section className="space-y-2">
        <h4 className="text-xs font-semibold">{t('interceptor.finder.response')}</h4>
        {row ? <HeaderList title={t('interceptor.finder.resHeaders')} headers={row.responseHeaders} /> : null}
        {row?.timing?.totalMs != null && (
          <p className="text-[11px] text-muted-foreground">
            {t('interceptor.finder.timingTotal')}: {row.timing.totalMs} ms
            {row.timing.dnsMs != null ? ` · DNS ${row.timing.dnsMs}` : ''}
            {row.timing.connectMs != null ? ` · Connect ${row.timing.connectMs}` : ''}
            {row.timing.tlsMs != null ? ` · TLS ${row.timing.tlsMs}` : ''}
            {row.timing.waitMs != null ? ` · TTFB ${row.timing.waitMs}` : ''}
            {row.timing.receiveMs != null ? ` · Download ${row.timing.receiveMs}` : ''}
          </p>
        )}
        {body ? <JsonViewer value={body} /> : <p className="text-xs text-muted-foreground">{t('interceptor.viewer.noBody')}</p>}
      </section>
    </div>
  )
}

function HeaderList({ title, headers }: { title: string; headers: { name: string; value: string }[] }) {
  if (!headers.length) return null
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-0.5 font-mono text-[11px]">
        {headers.map((header, index) => (
          <li key={`${header.name}${index}`} className="break-all">
            <span className="text-muted-foreground">{header.name}:</span> {header.value}
          </li>
        ))}
      </ul>
    </div>
  )
}
