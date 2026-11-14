import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getProviderSecrets, lookupSafeBrowsing, scanUrlLocal, type URLScanResult } from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { useActiveTabContext } from '@/features/security-center/hooks'
import { CapsLabel, FindingRow, Panel, StatusBadge, resultTone } from './ui'

export function UrlScannerTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const [url, setUrl] = useState(context.url && !context.restricted ? context.url : '')
  const [consent, setConsent] = useState(false)
  const [result, setResult] = useState<URLScanResult | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    const local = scanUrlLocal(url)
    const secrets = await getProviderSecrets()
    if (secrets.safeBrowsingApiKey && consent) {
      const remote = await lookupSafeBrowsing({ url: local.url || url, apiKey: secrets.safeBrowsingApiKey, consent })
      setResult({
        ...local,
        state: remote.state === 'known_malicious' ? 'known_malicious' : local.state,
        provider: remote.provider,
        lookedUpAt: remote.lookedUpAt,
        findings:
          remote.state === 'known_malicious'
            ? [
                ...local.findings,
                {
                  id: 'provider',
                  name: 'Provider match',
                  severity: 'critical',
                  evidence: remote.evidence ?? 'Provider reported a threat match.',
                  recommendation: 'Do not open this URL.',
                },
              ]
            : local.findings,
      })
    } else {
      setResult({
        ...local,
        provider: secrets.safeBrowsingApiKey ? 'Google Safe Browsing (not used — consent required)' : undefined,
      })
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>Local URL heuristics</CapsLabel>
        <p className="text-sm text-muted-foreground">
          This never claims a URL is guaranteed safe. Optional Safe Browsing stays off until an API key is saved and you consent.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/path" className="h-8 min-w-[10rem] flex-1" />
          <Button size="sm" variant="outline" disabled={!context.url || context.restricted} onClick={() => setUrl(context.url)}>
            Use this tab
          </Button>
          <Button size="sm" disabled={busy || !url.trim()} onClick={() => void run()}>
            {t('securityCenter.check', 'Check locally')}
          </Button>
        </div>
        <label className="flex items-start gap-2 text-xs">
          <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
          {t('securityCenter.consent', 'I consent to send this value to the configured provider.')}
        </label>
      </Panel>
      {result ? (
        <Panel className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={result.state.replaceAll('_', ' ')} tone={urlStateTone(result.state)} />
            <StatusBadge label={result.severity} tone={resultTone(result.severity === 'high' || result.severity === 'critical' ? 'failed' : 'warning')} />
            {result.provider ? <StatusBadge label={result.provider} tone="muted" /> : <StatusBadge label="local only" tone="muted" />}
          </div>
          <p className="font-mono text-xs">{result.url}</p>
          {result.findings.map((finding) => (
            <FindingRow key={finding.id} name={finding.name} result={finding.severity} evidence={finding.evidence} recommendation={finding.recommendation} />
          ))}
          <ul className="list-disc pl-4 text-xs text-muted-foreground">
            {result.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  )
}

function urlStateTone(state: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  if (state === 'known_malicious') return 'danger'
  if (state === 'suspicious') return 'warning'
  if (state === 'no_known_issue') return 'success'
  return 'muted'
}
