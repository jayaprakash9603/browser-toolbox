import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { collectLocalFingerprint, collectPageFingerprintWorld, collectPanelFingerprint, type FingerprintSignal } from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { useActiveTabContext } from '@/features/security-center/hooks'
import { CapsLabel, FindingRow, Panel } from './ui'

export function FingerprintTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const panel = useMemo(() => collectPanelFingerprint(), [])
  const [pageSignals, setPageSignals] = useState<FingerprintSignal[] | null>(null)
  const [busy, setBusy] = useState(false)

  const probePage = async () => {
    if (context.tabId == null || context.restricted) return
    setBusy(true)
    try {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: context.tabId },
        func: collectPageFingerprintWorld,
      })
      const value = injected[0]?.result
      setPageSignals(value ? collectLocalFingerprint(value) : null)
    } catch {
      setPageSignals(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>Local fingerprint signals</CapsLabel>
        <p className="text-sm text-muted-foreground">{t('securityCenter.noUniqueness', 'These signals are observed locally. This is not a global uniqueness score.')}</p>
        <Button size="sm" variant="outline" disabled={busy || context.restricted} onClick={() => void probePage()}>
          Probe active page
        </Button>
      </Panel>
      <SignalList title="This panel" signals={panel} />
      {pageSignals ? <SignalList title="Active page" signals={pageSignals} /> : null}
    </div>
  )
}

function SignalList({ title, signals }: { title: string; signals: FingerprintSignal[] }) {
  return (
    <div className="space-y-2">
      <CapsLabel>{title}</CapsLabel>
      {signals.map((signal) => (
        <FindingRow
          key={signal.id}
          name={signal.name}
          result={signal.classification}
          evidence={signal.value}
          recommendation={signal.explanation}
        />
      ))}
    </div>
  )
}
