import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { addAllowlistHost } from '@/core/adblock'
import { addTrustedHost } from '@/core/protection'
import {
  DEFAULT_SECURITY_CENTER_SETTINGS,
  clearSecurityEvents,
  exportSecurityCenterConfig,
  getProviderSecrets,
  parseSecurityCenterConfig,
  saveDnsHistory,
  updateProviderSecrets,
  validateBlockHost,
} from '@/core/security-center'
import { applySecurityPosture } from '@/features/security-center/actions'
import { PermissionNotice } from '@/features/site-access/PermissionNotice'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import {
  downloadText,
  useAdblockEngine,
  useProtectionEngine,
  useSecurityEvents,
  useSecuritySettings,
} from '@/features/security-center/hooks'
import { CapsLabel, Panel, StatusBadge } from './ui'

export function SettingsTab() {
  const { t } = useTranslation()
  const { settings, patch } = useSecuritySettings()
  const { state: protection, refresh: refreshProtection } = useProtectionEngine()
  const { state: adblock, refresh: refreshAdblock } = useAdblockEngine()
  const { refresh: refreshEvents } = useSecurityEvents()
  const cookiesGranted = usePermissionGranted({ permissions: ['cookies'] })
  const webRequestGranted = usePermissionGranted({ permissions: ['webRequest'] })
  const [blockHost, setBlockHost] = useState('')
  const [allowHost, setAllowHost] = useState('')
  const [breachKey, setBreachKey] = useState('')
  const [safeBrowsingKey, setSafeBrowsingKey] = useState('')
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [retentionText, setRetentionText] = useState(String(settings?.eventRetention ?? 500))
  const [logSizeText, setLogSizeText] = useState(String(settings?.networkLogSize ?? 400))

  useEffect(() => {
    void getProviderSecrets().then((secrets) => {
      setBreachKey(secrets.breachApiKey ?? '')
      setSafeBrowsingKey(secrets.safeBrowsingApiKey ?? '')
    })
  }, [])

  useEffect(() => {
    if (settings) {
      setRetentionText(String(settings.eventRetention))
      setLogSizeText(String(settings.networkLogSize))
    }
  }, [settings?.eventRetention, settings?.networkLogSize])

  if (!settings) return null

  const saveKeys = () => {
    void updateProviderSecrets({
      breachApiKey: breachKey.trim() || undefined,
      safeBrowsingApiKey: safeBrowsingKey.trim() || undefined,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>Posture</CapsLabel>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={settings.posture === 'balanced' ? 'secondary' : 'outline'} onClick={() => void applySecurityPosture('balanced')}>
            Balanced
          </Button>
          <Button size="sm" variant={settings.posture === 'strict' ? 'secondary' : 'outline'} onClick={() => void applySecurityPosture('strict')}>
            Strict
          </Button>
          <StatusBadge label={settings.posture} tone="info" />
        </div>
        <ToggleRow label="HTTPS upgrade" hint="Opt-in DNR upgradeScheme" checked={settings.httpsUpgrade} onChange={(on) => void patch({ httpsUpgrade: on })} />
        <ToggleRow label="Mixed-content warnings" hint="Observe HTTP resources on HTTPS pages" checked={settings.mixedContentWarnings} onChange={(on) => void patch({ mixedContentWarnings: on })} />
        <ToggleRow label="Scan on open" hint="Runs a local scan when Overview loads" checked={settings.scanOnOpen} onChange={(on) => void patch({ scanOnOpen: on })} />
        <ToggleRow label="Notifications" hint="Reserved; protection already has its own notices" checked={settings.notifications} onChange={(on) => void patch({ notifications: on })} />
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>Retention</CapsLabel>
        <label className="flex items-center gap-2 text-xs">
          Event log size
          <NumberField
            value={retentionText}
            onChange={setRetentionText}
            onBlur={() => {
              const parsed = parseNumberInRange(retentionText, 50, 2000)
              if (parsed) void patch({ eventRetention: parsed })
            }}
            min={50}
            max={2000}
            className="w-24"
            ariaLabel="Event log size"
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          Network log size
          <NumberField
            value={logSizeText}
            onChange={setLogSizeText}
            onBlur={() => {
              const parsed = parseNumberInRange(logSizeText, 50, 2000)
              if (parsed) void patch({ networkLogSize: parsed })
            }}
            min={50}
            max={2000}
            className="w-24"
            ariaLabel="Network log size"
          />
        </label>
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>DNS provider</CapsLabel>
        <Input
          value={settings.dnsProviderName}
          onChange={(event) => void patch({ dnsProviderName: event.target.value })}
          className="h-8"
          placeholder="Cloudflare"
        />
        <Input
          value={settings.dnsProviderUrl}
          onChange={(event) => void patch({ dnsProviderUrl: event.target.value })}
          className="h-8 font-mono"
          placeholder="https://cloudflare-dns.com/dns-query"
        />
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>Custom blocklist</CapsLabel>
        <p className="text-xs text-muted-foreground">Dedicated DNR range after interceptor. Does not replace Ad Blocker or Web Protection lists.</p>
        <ul className="space-y-1">
          {settings.blocklist.map((host) => (
            <li key={host} className="flex items-center justify-between font-mono text-xs">
              {host}
              <Button size="xs" variant="ghost" onClick={() => void patch({ blocklist: settings.blocklist.filter((item) => item !== host) })}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const host = validateBlockHost(blockHost)
            if (!host) return
            void patch({ blocklist: [...new Set([...settings.blocklist, host])] })
            setBlockHost('')
          }}
        >
          <Input value={blockHost} onChange={(event) => setBlockHost(event.target.value)} placeholder="ads.example" className="h-8" />
          <Button size="sm" type="submit">
            Block
          </Button>
        </form>
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>Allow / trust</CapsLabel>
        <p className="text-xs text-muted-foreground">Writes the Ad Blocker allowlist and Web Protection trusted hosts.</p>
        <ul className="space-y-1 font-mono text-xs">
          {(adblock?.allowlist ?? []).map((host) => (
            <li key={`a-${host}`} className="flex justify-between">
              {host} <span className="text-muted-foreground">ads</span>
            </li>
          ))}
          {(protection?.trusted ?? []).map((host) => (
            <li key={`t-${host}`} className="flex justify-between">
              {host} <span className="text-muted-foreground">trust</span>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const host = allowHost.trim()
            if (!host) return
            void Promise.all([addAllowlistHost(host), addTrustedHost(host)]).then(() => {
              refreshAdblock()
              refreshProtection()
              setAllowHost('')
            })
          }}
        >
          <Input value={allowHost} onChange={(event) => setAllowHost(event.target.value)} placeholder="example.com" className="h-8" />
          <Button size="sm" type="submit">
            Allow
          </Button>
        </form>
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>Provider keys</CapsLabel>
        <p className="text-xs text-muted-foreground">{t('securityCenter.vaultNote', 'API keys are stored in extension storage. That is not a hardware-backed secrets vault.')}</p>
        <Input type="password" autoComplete="off" value={breachKey} onChange={(event) => setBreachKey(event.target.value)} placeholder="HIBP API key" className="h-8" />
        <Input type="password" autoComplete="off" value={safeBrowsingKey} onChange={(event) => setSafeBrowsingKey(event.target.value)} placeholder="Safe Browsing API key" className="h-8" />
        <Button size="sm" onClick={saveKeys}>
          Save keys
        </Button>
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>Import / export</CapsLabel>
        <Button size="sm" variant="outline" onClick={() => downloadText('cyber-security-center.json', exportSecurityCenterConfig(settings))}>
          {t('securityCenter.export', 'Export')}
        </Button>
        <Textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste exported JSON" className="min-h-24 font-mono text-xs" />
        {importError ? <p className="text-xs text-destructive">{importError}</p> : null}
        <Button
          size="sm"
          onClick={() => {
            try {
              const next = parseSecurityCenterConfig(importText)
              void patch(next)
              setImportError(null)
            } catch (caught) {
              setImportError(caught instanceof Error ? caught.message : 'Invalid configuration')
            }
          }}
        >
          {t('securityCenter.import', 'Import')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void patch(DEFAULT_SECURITY_CENTER_SETTINGS)}>
          {t('securityCenter.reset', 'Reset settings')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void clearSecurityEvents().then(() => refreshEvents())
            void saveDnsHistory([])
          }}
        >
          {t('securityCenter.clearHistory', 'Clear security history')}
        </Button>
      </Panel>

      <Panel className="space-y-2">
        <CapsLabel>Diagnostics</CapsLabel>
        <StatusBadge label={`cookies ${cookiesGranted ? 'granted' : 'needed'}`} tone={cookiesGranted ? 'success' : 'muted'} />
        <StatusBadge label={`webRequest ${webRequestGranted ? 'granted' : 'needed'}`} tone={webRequestGranted ? 'success' : 'muted'} />
        <StatusBadge label={`DNR ${chrome.declarativeNetRequest ? 'available' : 'missing'}`} tone={chrome.declarativeNetRequest ? 'success' : 'danger'} />
        <StatusBadge label={`alarms ${chrome.alarms ? 'available' : 'missing'}`} tone={chrome.alarms ? 'success' : 'danger'} />
        <PermissionNotice active permissions={['cookies']} message="Cookie manager needs the optional cookies permission." />
        <PermissionNotice active permissions={['webRequest']} message="Live network and tracker observation needs webRequest." />
      </Panel>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
