import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  breachNotConfigured,
  getProviderSecrets,
  lookupHibpBreaches,
  type BreachLookupResult,
} from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { CapsLabel, EmptyNote, Panel, StatusBadge } from './ui'

export function BreachesTab() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [result, setResult] = useState<BreachLookupResult>(breachNotConfigured())
  const [hasKey, setHasKey] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getProviderSecrets().then((secrets) => setHasKey(Boolean(secrets.breachApiKey)))
  }, [])

  const run = async () => {
    const secrets = await getProviderSecrets()
    if (!secrets.breachApiKey) {
      setResult(breachNotConfigured())
      return
    }
    setBusy(true)
    setResult(await lookupHibpBreaches({ email, apiKey: secrets.breachApiKey, consent }))
    setEmail('')
    setBusy(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>Have I Been Pwned</CapsLabel>
        <p className="text-sm text-muted-foreground">
          {t('securityCenter.notConfigured', 'No provider configured')}. Add an API key in Settings. Email addresses are not stored.
        </p>
        {!hasKey ? <StatusBadge label="not configured" tone="muted" /> : <StatusBadge label="API key present" tone="info" />}
        <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" className="h-8" type="email" autoComplete="off" />
        <label className="flex items-start gap-2 text-xs">
          <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
          {t('securityCenter.consent', 'I consent to send this value to the configured provider.')}
        </label>
        <Button size="sm" disabled={!hasKey || !consent || busy || !email.trim()} onClick={() => void run()}>
          Check breaches
        </Button>
      </Panel>
      <Panel className="space-y-2">
        <StatusBadge label={result.state.replaceAll('_', ' ')} tone={result.state === 'results' ? 'warning' : result.state === 'no_results' ? 'success' : 'muted'} />
        {result.accountHint ? <p className="font-mono text-xs">{result.accountHint}</p> : null}
        {result.error ? <p className="text-xs text-destructive">{result.error}</p> : null}
        {result.breaches.map((breach) => (
          <div key={`${breach.name}-${breach.breachDate}`} className="rounded-lg border px-3 py-2">
            <p className="text-sm font-medium">{breach.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {breach.domain} {breach.breachDate} · {breach.dataClasses.join(', ')}
            </p>
            {breach.description ? <p className="mt-1 text-xs text-muted-foreground">{breach.description}</p> : null}
          </div>
        ))}
        {result.state === 'not_configured' ? <EmptyNote>Configure a HIBP API key in Settings before looking anything up. Hits are never mocked.</EmptyNote> : null}
      </Panel>
    </div>
  )
}
