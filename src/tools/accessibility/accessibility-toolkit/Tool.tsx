import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@/app/router'
import { RefreshCwIcon } from 'lucide-react'

import type { A11yCategory, A11yRuleOutcome } from '@/core/engines/a11y'
import { toolRegistry } from '@/core/registry'
import { pageLoadErrorKey } from '@/tools/seo/pageDataClient'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { PanelError } from '@/shared/components/toolkit'
import { useToast } from '@/shared/components/toast/useToast'

import { useAccessibilityTool } from '../_shared'
import { CategoryGrid } from './CategoryGrid'
import { ExportMenu } from './ExportMenu'
import { IssueList } from './IssueList'
import { PageInsights } from './PageInsights'
import { ScoreHero, type SeverityFilter } from './ScoreHero'
import { SettingsPanel } from './SettingsPanel'
import { TestingAidsPanel } from './TestingAidsPanel'
import { clearLocate, locateOnPage, resetPage, setPageAids } from './client'
import { DEFAULT_AIDS, type A11yAidCounts, type A11yAidState } from './inPage/aids'
import { useA11yAudit } from './useA11yAudit'
import { useA11yPrefs } from './prefs'

function formatScannedAt(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(timestamp)
}

export default function AccessibilityToolkitTool() {
  const { t, i18n } = useTranslation()
  const { show } = useToast()
  const tool = useAccessibilityTool('accessibility.toolkit')
  const { prefs, loaded, update, reset } = useA11yPrefs()
  const audit = useA11yAudit(prefs, loaded)
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [category, setCategory] = useState<A11yCategory | null>(null)
  const [showPassed, setShowPassed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aids, setAids] = useState<A11yAidState>(DEFAULT_AIDS)
  const [aidCounts, setAidCounts] = useState<A11yAidCounts | null>(null)
  const contrastTool = toolRegistry.get('design.contrast-checker')

  const scanning = audit.status === 'scanning'
  const tabId = audit.tabId

  useEffect(() => {
    if (!tabId) return
    let alive = true
    void setPageAids(tabId, aids).then((counts) => {
      if (alive) setAidCounts(counts)
    })
    return () => {
      alive = false
    }
  }, [aids, tabId])

  useEffect(() => {
    return () => {
      if (tabId != null) void resetPage(tabId)
    }
  }, [tabId])

  const patchAids = useCallback((patch: Partial<A11yAidState>) => setAids((prev) => ({ ...prev, ...patch })), [])

  const resetAids = useCallback(() => {
    setAids(DEFAULT_AIDS)
    if (tabId != null) void resetPage(tabId).then(() => setAidCounts(null))
  }, [tabId])

  const locate = useCallback(
    async (outcome: A11yRuleOutcome) => {
      if (tabId == null || outcome.nodes.length === 0) return
      await clearLocate(tabId)
      const targets = outcome.nodes.filter((n) => n.selector).map((n) => ({ selector: n.selector, label: n.detail ?? n.snippet }))
      const count = await locateOnPage(tabId, targets, outcome.severity)
      show(count > 0 ? t('a11y.locateDone', { count }) : t('a11y.locateFailed'), {
        variant: count > 0 ? 'success' : 'error',
      })
    },
    [show, t, tabId],
  )

  const clearFilters = useCallback(() => {
    setSeverity('all')
    setCategory(null)
    setShowPassed(false)
  }, [])

  const toastExport = useCallback((message: string) => show(message, { variant: 'success' }), [show])

  return (
    <ToolPage tool={tool}>
      <div className="@container flex flex-col gap-3">
        {!loaded || audit.status === 'idle' ? (
          <p className="animate-pulse text-xs text-muted-foreground">{t('a11y.loading')}</p>
        ) : audit.status === 'error' ? (
          <PanelError message={t(audit.errorKey ?? 'a11y.noPage')} />
        ) : audit.report ? (
          <>
            <ScoreHero
              report={audit.report}
              previousScore={audit.previousScore}
              scanning={scanning}
              severity={severity}
              onSeverity={(value) => {
                setSeverity(value)
                setShowPassed(false)
              }}
              onShowPassed={() => {
                setShowPassed(true)
                setSeverity('all')
                setCategory(null)
              }}
              actions={
                <>
                  <Button variant="outline" size="xs" disabled={scanning} onClick={() => void audit.scan()}>
                    <RefreshCwIcon className={scanning ? 'size-3.5 motion-safe:animate-spin motion-reduce:animate-none' : 'size-3.5'} />
                    {scanning ? t('a11y.scanning') : t('a11y.rescan')}
                  </Button>
                  <SettingsPanel
                    prefs={prefs}
                    onChange={update}
                    onReset={reset}
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    disabled={scanning}
                  />
                  <ExportMenu report={audit.report} onDone={toastExport} disabled={scanning} />
                </>
              }
            />

            {audit.scannedAt != null && (
              <p className="text-center text-[10px] text-muted-foreground">
                {t('a11y.scannedAt', { time: formatScannedAt(audit.scannedAt, i18n.language) })}
              </p>
            )}

            <CategoryGrid
              report={audit.report}
              active={category}
              onSelect={(next) => {
                setCategory(next)
                if (next) setShowPassed(false)
              }}
            />

            <TestingAidsPanel state={aids} counts={aidCounts} disabled={tabId == null} onChange={patchAids} onReset={resetAids} />

            <PageInsights scan={audit.report.scan} />

            <IssueList
              report={audit.report}
              severity={severity}
              category={category}
              showPassed={showPassed}
              busy={scanning}
              onLocate={locate}
              onClearFilters={clearFilters}
            />

            {contrastTool && (
              <p className="text-[11px] text-muted-foreground">
                {t('a11y.contrastHint')}{' '}
                <Link to={contrastTool.route} className="text-primary hover:underline">
                  {t('a11y.openContrast')}
                </Link>
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">{t('a11y.disclaimer')}</p>
          </>
        ) : scanning ? (
          <p className="text-xs text-muted-foreground">{t('a11y.loading')}</p>
        ) : (
          <PanelError message={t(pageLoadErrorKey('NO_TAB'))} />
        )}
      </div>
    </ToolPage>
  )
}
