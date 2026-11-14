import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangleIcon,
  GlobeIcon,
  LayersIcon,
  LockIcon,
  RadarIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { categoryBreakdown, postureLabel } from '@/core/security-center'
import type { SecurityEvent } from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  downloadText,
  relativeTime,
  useActiveTabContext,
  useOverviewScan,
  useProtectionEngine,
  useSecurityEvents,
  useSecuritySettings,
} from '@/features/security-center/hooks'
import { exportScanReportMarkdown } from '@/core/security-center'
import { BarRow, CapsLabel, EmptyNote, MetricCard, Panel, ScoreRing, StatusBadge, resultTone } from './ui'

const FEED_FILTERS = ['all', 'alert', 'block', 'audit'] as const

export function OverviewTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const { report, scanning, scan, error } = useOverviewScan()
  const { events } = useSecurityEvents()
  const { settings } = useSecuritySettings()
  const { stats } = useProtectionEngine()
  const [feedFilter, setFeedFilter] = useState<(typeof FEED_FILTERS)[number]>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (settings?.scanOnOpen && !context.restricted) void scan()
    // One automatic pass when the setting is on; later scans are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.scanOnOpen, context.url])

  const host = context.hostname || context.domain || '—'
  const score = report?.score ?? null
  const breakdown = report ? categoryBreakdown(report.findings) : null
  const hostThreats = (stats?.recent ?? []).filter(
    (entry) => entry.host === context.hostname || (context.domain && entry.host.endsWith(context.domain)),
  ).length
  const headerIssues =
    report?.findings.filter((finding) => finding.category === 'headers' && (finding.result === 'warning' || finding.result === 'failed'))
      .length ?? 0
  const grantedPermissions =
    report?.findings.find((finding) => finding.id === 'permissions')?.evidence?.startsWith('Granted:') ? 1 : 0

  const feed = useMemo(() => {
    return events.filter((event) => {
      if (feedFilter === 'alert' && event.severity !== 'high' && event.severity !== 'critical') return false
      if (feedFilter === 'block' && !event.type.includes('blocked') && event.type !== 'dangerous_download_warning') return false
      if (feedFilter === 'audit' && event.category !== 'audit') return false
      if (query && !`${event.description} ${event.domain ?? ''} ${event.type}`.toLowerCase().includes(query.toLowerCase())) {
        return false
      }
      return true
    })
  }, [events, feedFilter, query])

  return (
    <div className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <CapsLabel>{t('securityCenter.target', 'Target')}</CapsLabel>
          <p className="truncate font-mono text-sm font-semibold">{host}</p>
          {context.restrictedReason ? <p className="text-xs text-muted-foreground">{context.restrictedReason}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={context.https ? t('securityCenter.https', 'HTTPS') : context.url ? t('securityCenter.http', 'HTTP') : '—'}
            tone={context.https ? 'success' : context.url && !context.restricted ? 'danger' : 'muted'}
            pulse={context.https}
          />
          <StatusBadge
            label={postureLabel(score, report?.completedChecks ?? 0)}
            tone={score == null ? 'muted' : score >= 70 ? 'success' : 'warning'}
          />
          <Button size="sm" onClick={() => void scan()} disabled={scanning || context.restricted}>
            {scanning ? t('securityCenter.scanning', 'Scanning…') : t('securityCenter.executeScan', 'Scan current website')}
          </Button>
        </div>
      </Panel>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="grid gap-3 @lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
        <Panel className="flex flex-wrap items-center gap-4">
          <ScoreRing score={score} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-mono text-[11px] text-muted-foreground">
              {report?.scoreExplanation ?? 'Scan this tab to compute a score from completed checks only.'}
            </p>
            <BarRow label="Protection" value={breakdown?.protection.score ?? null} icon={<ShieldIcon className="size-3" />} />
            <BarRow label="Privacy" value={breakdown?.trackers.score ?? null} icon={<RadarIcon className="size-3" />} />
            <BarRow label="Connection" value={breakdown?.connection.score ?? null} icon={<LockIcon className="size-3" />} />
            <BarRow label="Headers" value={breakdown?.headers.score ?? null} icon={<GlobeIcon className="size-3" />} />
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => void scan()} disabled={scanning}>
                {t('securityCenter.refresh', 'Refresh')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!report}
                onClick={() => report && downloadText(`security-scan-${report.domain || 'tab'}.md`, exportScanReportMarkdown(report), 'text/markdown')}
              >
                {t('securityCenter.export', 'Export')}
              </Button>
            </div>
          </div>
        </Panel>
        <Panel className="space-y-2">
          <CapsLabel>{t('securityCenter.breakdown', 'Check breakdown')}</CapsLabel>
          <ul className="space-y-1.5">
            {(report?.findings ?? []).slice(0, 8).map((check) => (
              <li key={check.id} className="flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="truncate">{check.name}</span>
                <StatusBadge label={check.result.replaceAll('_', ' ')} tone={resultTone(check.result)} />
              </li>
            ))}
            {!report ? <li className="text-xs text-muted-foreground">No scan yet.</li> : null}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3">
        <MetricCard
          label="Threats recorded"
          value={String(hostThreats)}
          hint={hostThreats ? 'From this host in the protection log' : 'None recorded — not a forever-clean claim'}
          tone={hostThreats > 0 ? 'warning' : 'muted'}
          icon={<ShieldAlertIcon className="size-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Trackers blocked"
          value={String(report?.trackersBlocked ?? 0)}
          hint="Ad-blocker network hits on this tab"
          tone="info"
          icon={<RadarIcon className="size-4 text-muted-foreground" />}
        />
        <MetricCard
          label="3rd-party cookies"
          value={report?.thirdPartyCookies == null ? 'Need access' : String(report.thirdPartyCookies)}
          hint={report?.thirdPartyCookies == null ? 'Optional cookies permission' : 'Metadata only'}
          tone={report?.thirdPartyCookies == null ? 'muted' : 'info'}
          icon={<LayersIcon className="size-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Risky permissions"
          value={String(grantedPermissions)}
          hint="Page Permission API"
          icon={<AlertTriangleIcon className="size-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Header issues"
          value={String(headerIssues)}
          hint={`${report?.findings.length ?? 0} findings`}
          tone={headerIssues > 0 ? 'warning' : 'success'}
          icon={<ShieldCheckIcon className="size-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Connection"
          value={context.https ? 'HTTPS URL' : context.url && !context.restricted ? 'HTTP URL' : 'Unknown'}
          hint={t('securityCenter.certUnavailable', 'Certificate details are not available to extensions.')}
          tone={context.https ? 'success' : context.restricted ? 'muted' : 'danger'}
          icon={<LockIcon className="size-4 text-muted-foreground" />}
        />
      </div>

      <Panel className="flex min-h-[12rem] flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CapsLabel>{t('securityCenter.feed', 'Security activity')}</CapsLabel>
          <div className="flex flex-wrap gap-1">
            {FEED_FILTERS.map((filter) => (
              <Button key={filter} size="sm" variant={feedFilter === filter ? 'secondary' : 'ghost'} onClick={() => setFeedFilter(filter)}>
                {filter}
              </Button>
            ))}
          </div>
        </div>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter events…" className="h-8" />
        <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
          {feed.slice(0, 40).map((event) => (
            <FeedRow key={event.id} event={event} />
          ))}
          {feed.length === 0 ? <EmptyNote>{t('securityCenter.noEvents', 'No security events recorded yet.')}</EmptyNote> : null}
        </ul>
      </Panel>
    </div>
  )
}

function FeedRow({ event }: { event: SecurityEvent }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60">
      <ShieldIcon className="size-3.5 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{event.description}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{event.domain ?? event.source}</p>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{relativeTime(event.timestamp)}</span>
    </li>
  )
}
