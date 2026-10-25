import { Settings2Icon, ShieldIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SettingsGroup, SettingsRow } from '@/app/pages/settings/ui'
import type { ScriptStudioSettings } from '@/core/script-studio'
import { DEFAULT_SCRIPT_STUDIO_SETTINGS } from '@/core/script-studio/settings'
import { factoryResetScriptStudio } from '@/core/script-studio/service'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'

type Props = {
  settings: ScriptStudioSettings
  onChange: (patch: Partial<ScriptStudioSettings>) => void
}

export function SettingsView({ settings, onChange }: Props) {
  const { t } = useTranslation()
  const advanced = settings.configMode === 'advanced'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SettingsGroup icon={Settings2Icon} title="General" description="Script Studio behavior and tips">
        <SettingsRow label="Config mode" description="Show advanced security and update options">
          <Select
            value={settings.configMode}
            onValueChange={(v) => onChange({ configMode: v as ScriptStudioSettings['configMode'] })}
          >
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Show guide tips">
          <Switch checked={settings.showGuideTips} onCheckedChange={(v) => onChange({ showGuideTips: v })} />
        </SettingsRow>
        <SettingsRow label="Trash mode">
          <Select
            value={settings.trashMode}
            onValueChange={(v) => onChange({ trashMode: v as ScriptStudioSettings['trashMode'] })}
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="clean-on-exit">Clean on exit</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsGroup>

      {advanced ? (
        <SettingsGroup icon={ShieldIcon} title="Updates & security" description="Network, cookies, and subframes">
          <SettingsRow label="Update interval (hours)">
            <input
              type="number"
              className="h-8 w-20 rounded-md border bg-background px-2 text-xs"
              value={settings.updateIntervalHours}
              onChange={(e) => onChange({ updateIntervalHours: Number(e.target.value) })}
            />
          </SettingsRow>
          <SettingsRow label="Auto-install updates">
            <Switch checked={settings.autoInstallUpdates} onCheckedChange={(v) => onChange({ autoInstallUpdates: v })} />
          </SettingsRow>
          <SettingsRow label="Cookie access (GM_cookie)">
            <Switch checked={settings.allowCookieAccess} onCheckedChange={(v) => onChange({ allowCookieAccess: v })} />
          </SettingsRow>
          <SettingsRow label="@connect mode">
            <Select
              value={settings.connectMode}
              onValueChange={(v) => onChange({ connectMode: v as ScriptStudioSettings['connectMode'] })}
            >
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prompt">Prompt</SelectItem>
                <SelectItem value="allowlist">Allowlist</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Run in subframes">
            <Switch checked={settings.runInSubframes} onCheckedChange={(v) => onChange({ runInSubframes: v })} />
          </SettingsRow>
        </SettingsGroup>
      ) : null}

      <Button
        variant="destructive"
        onClick={() => {
          if (confirm('Reset all Script Studio data?')) void factoryResetScriptStudio().then(() => onChange(DEFAULT_SCRIPT_STUDIO_SETTINGS))
        }}
      >
        {t('scriptStudio.settings.reset')}
      </Button>
    </div>
  )
}
