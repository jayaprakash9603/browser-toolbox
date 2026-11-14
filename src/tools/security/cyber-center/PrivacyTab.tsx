import { useTranslation } from 'react-i18next'

import { addAllowlistHost, removeAllowlistHost } from '@/core/adblock'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { useAdblockEngine, useProtectionEngine, useSecuritySettings } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge } from './ui'

export function PrivacyTab() {
  const { t } = useTranslation()
  const { settings, patch } = useSecuritySettings()
  const { state: adblock, patch: patchAdblock, refresh } = useAdblockEngine()
  const { state: protection } = useProtectionEngine()
  const allowlist = adblock?.allowlist ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>Privacy posture</CapsLabel>
        <p className="text-sm text-muted-foreground">
          These controls write the same Ad Blocker and Web Protection settings. They cannot hide you from a site you are logged into, and they do not claim anonymity.
        </p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={protection?.enabled ? 'Protection on' : 'Protection off'} tone={protection?.enabled ? 'success' : 'muted'} />
          <StatusBadge label={adblock?.enabled ? 'Ad block on' : 'Ad block off'} tone={adblock?.enabled ? 'success' : 'muted'} />
        </div>
      </Panel>
      <div className="grid gap-2 sm:grid-cols-2">
        <ToggleCard
          title="Block tracking lists"
          hint="EasyPrivacy via the ad blocker"
          checked={adblock?.lists.privacy ?? false}
          onChange={(on) => adblock && void patchAdblock({ lists: { ...adblock.lists, privacy: on } })}
        />
        <ToggleCard
          title="Hide cookie banners"
          hint="Cosmetic filter list"
          checked={adblock?.cookieBanners ?? false}
          onChange={(on) => adblock && void patchAdblock({ cookieBanners: on })}
        />
        <ToggleCard
          title="Block pop-ups"
          hint="Pop-up and overlay list"
          checked={adblock?.blockPopups ?? false}
          onChange={(on) => adblock && void patchAdblock({ blockPopups: on })}
        />
        <ToggleCard
          title="Mixed-content warnings"
          hint="Observe HTTP resources on HTTPS pages"
          checked={settings?.mixedContentWarnings ?? true}
          onChange={(on) => void patch({ mixedContentWarnings: on })}
        />
      </div>
      <Panel className="space-y-2">
        <div className="flex items-center justify-between">
          <CapsLabel>Site allowlist</CapsLabel>
          <StatusBadge label={`${allowlist.length} hosts`} tone="info" />
        </div>
        <ul className="space-y-1">
          {allowlist.map((host) => (
            <li key={host} className="flex items-center justify-between gap-2 font-mono text-xs">
              {host}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void removeAllowlistHost(host).then(() => refresh())}
              >
                Remove
              </Button>
            </li>
          ))}
          {allowlist.length === 0 ? <EmptyNote>No allowlisted hosts.</EmptyNote> : null}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const input = form.elements.namedItem('host') as HTMLInputElement
            const host = input.value.trim()
            if (!host) return
            void addAllowlistHost(host).then(() => {
              refresh()
              input.value = ''
            })
          }}
        >
          <Input name="host" placeholder="example.com" className="h-8" />
          <Button size="sm" type="submit">
            Allow
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          {t('securityCenter.scope', 'DNT and Global Privacy Control are page signals, not something this extension can force on every site.')}
        </p>
      </Panel>
    </div>
  )
}

function ToggleCard({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string
  hint: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <Panel className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Panel>
  )
}
