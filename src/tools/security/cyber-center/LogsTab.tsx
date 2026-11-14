import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { clearSecurityEvents, exportSecurityEvents, matchesEventFilters } from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { downloadText, relativeTime, useSecurityEvents } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge, resultTone } from './ui'

const CATEGORIES = ['all', 'protection', 'privacy', 'trackers', 'cookies', 'audit', 'network', 'settings', 'permissions'] as const

export function LogsTab() {
  const { t } = useTranslation()
  const { events, refresh } = useSecurityEvents()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all')

  const rows = useMemo(
    () => events.filter((event) => matchesEventFilters(event, { query, category })),
    [events, query, category],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center gap-2">
        <CapsLabel>Security logs</CapsLabel>
        <StatusBadge label={`${rows.length} events`} tone="info" />
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => downloadText('security-events.json', exportSecurityEvents(rows))}>
          {t('securityCenter.export', 'Export')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!window.confirm('Clear the local security event log?')) return
            void clearSecurityEvents().then(() => refresh())
          }}
        >
          {t('securityCenter.clear', 'Clear')}
        </Button>
      </Panel>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search description, host, type…" className="h-8" />
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((id) => (
          <Button key={id} size="xs" variant={category === id ? 'secondary' : 'ghost'} onClick={() => setCategory(id)}>
            {id}
          </Button>
        ))}
      </div>
      <Panel className="min-h-0 flex-1 space-y-1 overflow-auto">
        {rows.map((event) => (
          <div key={event.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60">
            <StatusBadge label={event.severity} tone={resultTone(event.severity === 'high' || event.severity === 'critical' ? 'failed' : event.severity)} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{event.description}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {event.type} · {event.category} · {event.domain ?? event.source}
              </p>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(event.timestamp)}</span>
          </div>
        ))}
        {rows.length === 0 ? <EmptyNote>{t('securityCenter.noEvents', 'No security events recorded yet.')}</EmptyNote> : null}
      </Panel>
    </div>
  )
}
