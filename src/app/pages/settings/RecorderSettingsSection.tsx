import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { DEFAULT_RECORDER_SETTINGS, loadRecorderSettings, saveRecorderSettings } from '@/core/recorder/settings'
import type { RecorderSettings } from '@/core/recorder/types'
import { Switch } from '@/shared/components/ui/switch'

const RECORDER_TOOL_ROUTE = '/tools/screenshots/recorder'

export function RecorderSettingsSection() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<RecorderSettings>(DEFAULT_RECORDER_SETTINGS)

  useEffect(() => {
    void loadRecorderSettings().then(setSettings)
  }, [])

  const patch = (next: Partial<RecorderSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }))
    void saveRecorderSettings(next).then(setSettings)
  }

  const active = settings.enabled

  return (
    <>
      <SettingsRow
        searchId="recorderEnabled"
        label={t('recorder.settings.enabled')}
        description={t('recorder.settings.enabledHint')}
      >
        <Switch
          checked={active}
          onCheckedChange={(on) => patch({ enabled: on })}
          aria-label={t('recorder.settings.enabled')}
        />
      </SettingsRow>
      <SettingsRow
        searchId="recorderMic"
        label={t('recorder.options.mic')}
        description={t('recorder.settings.micHint')}
      >
        <Switch
          checked={settings.mic}
          disabled={!active}
          onCheckedChange={(on) => patch({ mic: on })}
          aria-label={t('recorder.options.mic')}
        />
      </SettingsRow>
      <SettingsRow
        searchId="recorderCountdown"
        label={t('recorder.options.countdown')}
        description={t('recorder.settings.countdownHint')}
      >
        <Switch
          checked={settings.countdown}
          disabled={!active}
          onCheckedChange={(on) => patch({ countdown: on })}
          aria-label={t('recorder.options.countdown')}
        />
      </SettingsRow>
      <SettingsLinkRow to={RECORDER_TOOL_ROUTE}>{t('recorder.settings.openTool')}</SettingsLinkRow>
    </>
  )
}
