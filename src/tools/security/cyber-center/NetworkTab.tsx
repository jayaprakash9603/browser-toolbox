import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { matchesNetworkFilters } from '@/core/security-center'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { useActiveTabContext, useSecurityNetworkLog } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge } from './ui'

const KINDS = ['all', 'document', 'xhr', 'script', 'stylesheet', 'image', 'blocked', 'failed'] as const

export function NetworkTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const { entries, clear, paused, setCapturePaused } = useSecurityNetworkLog(context.tabId)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('all')
  const [thirdParty, setThirdParty] = useState(false)

  const rows = useMemo(
    () => entries.filter((entry) => matchesNetworkFilters(entry, { query, kind, thirdParty })).slice(-400).reverse(),
    [entries, query, kind, thirdParty],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center gap-2">
        <CapsLabel>Network metadata</CapsLabel>
        <StatusBadge label={paused ? 'Paused' : 'Capturing'} tone={paused ? 'warning' : 'success'} pulse={!paused} />
        <StatusBadge label={`${rows.length} shown`} tone="info" />
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => setCapturePaused(!paused)}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button size="sm" variant="ghost" onClick={clear}>
          {t('securityCenter.clear', 'Clear')}
        </Button>
      </Panel>
      <PermissionNotice
        active
        permissions={['webRequest']}
        message="Allow network observation to record request metadata for this tab. Response bodies are never captured."
      />
      <div className="flex flex-wrap gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter URL, host, method…" className="h-8 min-w-[10rem] flex-1" />
        {KINDS.map((id) => (
          <Button key={id} size="xs" variant={kind === id ? 'secondary' : 'ghost'} onClick={() => setKind(id)}>
            {id}
          </Button>
        ))}
        <Button size="xs" variant={thirdParty ? 'secondary' : 'outline'} onClick={() => setThirdParty((value) => !value)}>
          Third-party
        </Button>
      </div>
      <Panel className="min-h-0 flex-1 overflow-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-card font-mono text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">Method</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Host</th>
              <th className="px-2 py-2">URL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-2 py-1 font-mono">{row.method}</td>
                <td className="px-2 py-1 font-mono">{row.status ?? (row.blocked ? 'blocked' : row.error ? 'err' : '—')}</td>
                <td className="px-2 py-1">{row.kind}</td>
                <td className="px-2 py-1 font-mono">{row.hostname}</td>
                <td className="max-w-[16rem] truncate px-2 py-1 font-mono" title={row.url}>
                  {row.url}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyNote>No requests recorded. This log is metadata only — distinct from HTTP Interceptor.</EmptyNote>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
