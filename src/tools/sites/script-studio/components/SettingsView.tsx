import { useTranslation } from 'react-i18next'

import type { ScriptStudioSettings } from '@/core/script-studio'
import { DEFAULT_SCRIPT_STUDIO_SETTINGS } from '@/core/script-studio/settings'
import { factoryResetScriptStudio } from '@/core/script-studio/service'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'

type Props = {
  settings: ScriptStudioSettings
  onChange: (patch: Partial<ScriptStudioSettings>) => void
}

export function SettingsView({ settings, onChange }: Props) {
  const { t } = useTranslation()
  const advanced = settings.configMode === 'advanced'

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-sm">
      <section className="space-y-2">
        <h2 className="font-semibold">General</h2>
        <label className="flex items-center justify-between">
          Config mode
          <select
            className="rounded-md border px-2 py-1 text-xs"
            value={settings.configMode}
            onChange={(e) => onChange({ configMode: e.target.value as ScriptStudioSettings['configMode'] })}
          >
            <option value="beginner">Beginner</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="flex items-center justify-between">
          Show guide tips
          <Switch checked={settings.showGuideTips} onCheckedChange={(v) => onChange({ showGuideTips: v })} />
        </label>
        <label className="flex items-center justify-between">
          Trash mode
          <select
            className="rounded-md border px-2 py-1 text-xs"
            value={settings.trashMode}
            onChange={(e) => onChange({ trashMode: e.target.value as ScriptStudioSettings['trashMode'] })}
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="clean-on-exit">Clean on exit</option>
          </select>
        </label>
      </section>

      {advanced ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Updates</h2>
          <label className="flex items-center justify-between">
            Interval (hours)
            <input
              type="number"
              className="w-20 rounded-md border px-2 py-1 text-xs"
              value={settings.updateIntervalHours}
              onChange={(e) => onChange({ updateIntervalHours: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center justify-between">
            Auto-install updates
            <Switch checked={settings.autoInstallUpdates} onCheckedChange={(v) => onChange({ autoInstallUpdates: v })} />
          </label>
        </section>
      ) : null}

      {advanced ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Security</h2>
          <label className="flex items-center justify-between">
            Cookie access (GM_cookie)
            <Switch checked={settings.allowCookieAccess} onCheckedChange={(v) => onChange({ allowCookieAccess: v })} />
          </label>
          <label className="flex items-center justify-between">
            @connect mode
            <select
              className="rounded-md border px-2 py-1 text-xs"
              value={settings.connectMode}
              onChange={(e) => onChange({ connectMode: e.target.value as ScriptStudioSettings['connectMode'] })}
            >
              <option value="prompt">Prompt</option>
              <option value="allowlist">Allowlist</option>
              <option value="deny">Deny</option>
            </select>
          </label>
          <label className="flex items-center justify-between">
            Run in subframes
            <Switch checked={settings.runInSubframes} onCheckedChange={(v) => onChange({ runInSubframes: v })} />
          </label>
        </section>
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
