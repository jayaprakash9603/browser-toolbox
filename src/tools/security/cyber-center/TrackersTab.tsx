import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { classifyRequest, groupTrackers } from '@/core/security-center'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { Input } from '@/shared/components/ui/input'
import { useActiveTabContext, useAdblockEngine, useSecurityNetworkLog } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge, resultTone } from './ui'

export function TrackersTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const { entries } = useSecurityNetworkLog(context.tabId)
  const { tabEntry } = useAdblockEngine()
  const granted = usePermissionGranted({ permissions: ['webRequest'] })
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const records = entries
      .map((entry) =>
        classifyRequest({
          url: entry.url,
          pageUrl: context.url,
          resourceType: entry.resourceType,
          blocked: entry.blocked,
          initiator: entry.initiator,
          timestamp: entry.timestamp,
          tabId: entry.tabId,
          requestId: entry.requestId,
        }),
      )
      .filter((item): item is NonNullable<typeof item> => item != null)
    return groupTrackers(records).filter((row) => `${row.domain} ${row.category}`.toLowerCase().includes(query.toLowerCase()))
  }, [entries, context.url, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CapsLabel>Observed trackers</CapsLabel>
          <p className="text-sm text-muted-foreground">
            Classified against the bundled tracker suffix map. Not every third-party request is a tracker.
          </p>
        </div>
        <StatusBadge label={`${tabEntry?.network ?? 0} blocked by DNR`} tone="info" />
      </Panel>
      <PermissionNotice
        active
        permissions={['webRequest']}
        message={t('securityCenter.grantWebRequest', 'Allow network observation to classify live requests. Blocked counts still come from DNR feedback.')}
      />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter hosts…" className="h-8" />
      <Panel className="min-h-0 flex-1 overflow-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-card font-mono text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Host</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Blocked</th>
              <th className="px-3 py-2">Hits</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((row) => (
              <tr key={row.domain} className="border-t">
                <td className="px-3 py-1.5 font-mono">{row.domain}</td>
                <td className="px-3 py-1.5">{row.category}</td>
                <td className="px-3 py-1.5">{row.thirdParty ? 'third' : 'first'}</td>
                <td className="px-3 py-1.5">
                  <StatusBadge label={row.blocked ? 'blocked' : 'detected'} tone={resultTone(row.blocked ? 'failed' : 'warning')} />
                </td>
                <td className="px-3 py-1.5 font-mono">{row.count}</td>
              </tr>
            ))}
            {grouped.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                  {granted === false
                    ? 'Grant webRequest to observe hosts, or wait for DNR blocked counts.'
                    : 'No catalog-matched trackers observed yet.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Panel>
      {grouped.length === 0 && granted === false ? <EmptyNote>Optional permission needed for live observation.</EmptyNote> : null}
    </div>
  )
}
