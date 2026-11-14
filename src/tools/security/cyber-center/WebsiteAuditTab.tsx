import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { exportScanReportMarkdown } from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { runSiteScanBundle, type SiteScanBundle } from '@/features/security-center/runScan'
import { downloadText, useActiveTabContext } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, FindingRow, Panel, StatusBadge, resultTone } from './ui'

export function WebsiteAuditTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const [bundle, setBundle] = useState<SiteScanBundle | null>(null)
  const [scanning, setScanning] = useState(false)

  const run = async () => {
    setScanning(true)
    try {
      setBundle(await runSiteScanBundle())
    } finally {
      setScanning(false)
    }
  }

  const findings = bundle?.report.findings ?? []
  const counts = {
    passed: findings.filter((item) => item.result === 'passed').length,
    warning: findings.filter((item) => item.result === 'warning').length,
    failed: findings.filter((item) => item.result === 'failed').length,
    missing: findings.filter((item) => item.result === 'not_available').length,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CapsLabel>Website audit</CapsLabel>
          <p className="font-mono text-sm">{context.hostname || '—'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void run()} disabled={scanning || context.restricted}>
            {scanning ? t('securityCenter.scanning', 'Scanning…') : t('securityCenter.executeScan', 'Scan current website')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!bundle}
            onClick={() => bundle && downloadText(`audit-${bundle.report.domain}.md`, exportScanReportMarkdown(bundle.report), 'text/markdown')}
          >
            {t('securityCenter.export', 'Export')}
          </Button>
        </div>
      </Panel>
      <Panel>
        <p className="text-sm text-muted-foreground">
          {t(
            'securityCenter.scope',
            'This scan uses the tab URL, optional response headers, the document, and local protection stats. It is not a server-side penetration test. Missing optional headers are warnings, not confirmed vulnerabilities.',
          )}
        </p>
      </Panel>
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={`${counts.passed} passed`} tone="success" />
        <StatusBadge label={`${counts.warning} warnings`} tone="warning" />
        <StatusBadge label={`${counts.failed} failed`} tone="danger" />
        <StatusBadge label={`${counts.missing} unavailable`} tone="muted" />
        <StatusBadge label={bundle ? `${bundle.report.score ?? '—'} / 100` : 'Not scored'} tone={resultTone(bundle?.report.score != null ? 'passed' : 'not_checked')} />
      </div>
      <div className="space-y-2">
        {findings.map((finding) => (
          <FindingRow
            key={finding.id}
            name={finding.name}
            result={finding.result}
            evidence={finding.evidence}
            recommendation={`${finding.explanation ?? ''} ${finding.recommendation}`.trim()}
          />
        ))}
        {findings.length === 0 ? <EmptyNote>Run a scan to list header and document findings.</EmptyNote> : null}
      </div>
      <Panel className="space-y-2">
        <CapsLabel>Raw headers</CapsLabel>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
          {bundle?.rawHeaders ?? '# Scan to load document headers.'}
        </pre>
      </Panel>
    </div>
  )
}
