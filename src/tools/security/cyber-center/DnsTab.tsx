import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getDnsHistory,
  isValidLookupName,
  lookupDns,
  rememberDnsLookup,
  saveDnsHistory,
  type DnsHistoryEntry,
  type DnsRecordType,
} from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { useActiveTabContext, useSecuritySettings } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge } from './ui'

const TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']

export function DnsTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const { settings } = useSecuritySettings()
  const [name, setName] = useState('')
  const [type, setType] = useState<DnsRecordType>('A')
  const [history, setHistory] = useState<DnsHistoryEntry[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getDnsHistory().then(setHistory)
  }, [])

  const lookup = async (queryName = name) => {
    const trimmed = queryName.trim()
    if (!isValidLookupName(trimmed)) return
    setBusy(true)
    const result = await lookupDns({
      name: trimmed,
      type,
      providerUrl: settings?.dnsProviderUrl,
      providerName: settings?.dnsProviderName,
    })
    const next = rememberDnsLookup(history, result)
    setHistory(next)
    await saveDnsHistory(next)
    setBusy(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>DNS over HTTPS</CapsLabel>
        <p className="text-sm text-muted-foreground">
          Lookups are user-triggered only. The current site is never queried silently. Default provider is {settings?.dnsProviderName ?? 'Cloudflare'}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="example.com" className="h-8 min-w-[10rem] flex-1" />
          <Select value={type} onValueChange={(value) => setType(value as DnsRecordType)}>
            <SelectTrigger size="sm" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy || !isValidLookupName(name)} onClick={() => void lookup()}>
            {t('securityCenter.lookup', 'Lookup')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!context.hostname || context.restricted}
            onClick={() => {
              setName(context.hostname)
              void lookup(context.hostname)
            }}
          >
            Lookup this tab
          </Button>
        </div>
      </Panel>
      <Panel className="min-h-0 flex-1 space-y-3 overflow-auto">
        {history.map((entry) => (
          <div key={entry.id} className="rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-medium">
                {entry.query} {entry.type}
              </p>
              <StatusBadge label={entry.provider} tone="info" />
              {entry.error ? <StatusBadge label={entry.error} tone="danger" /> : <StatusBadge label={`${entry.records.length} records`} tone="success" />}
            </div>
            <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-muted-foreground">
              {entry.records.map((record, index) => (
                <li key={`${record.data}-${index}`}>
                  {record.type} {record.data}
                  {record.ttl != null ? ` ttl=${record.ttl}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {history.length === 0 ? <EmptyNote>No DNS lookups yet. IP geo/ASN stays unavailable until a provider is configured in Settings.</EmptyNote> : null}
      </Panel>
    </div>
  )
}
