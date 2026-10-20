import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { useNetMonitorSettings } from '@/features/netmon/hooks'
import { NETMON_ROUTE } from '@/features/netmon/routes'
import { Switch } from '@/shared/components/ui/switch'

export function NetMonitorSettingsSection() {
  const { t } = useTranslation()
  const { settings, patch } = useNetMonitorSettings()
  if (!settings) return null
  return (
    <>
      <SettingsRow
        searchId="internetMonitor"
        label={t('netmon.settingsPage.title')}
        description={t('netmon.settingsPage.hint')}
      >
        <Switch
          checked={settings.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('netmon.enable')}
        />
      </SettingsRow>
      <SettingsRow label={t('netmon.settings.headerIcon')} description={t('netmon.settings.headerIconHint')}>
        <Switch
          checked={settings.showHeaderIcon}
          disabled={!settings.enabled}
          onCheckedChange={(on) => void patch({ showHeaderIcon: on })}
          aria-label={t('netmon.settings.headerIcon')}
        />
      </SettingsRow>
      <SettingsLinkRow to={NETMON_ROUTE}>{t('netmon.settingsPage.link')}</SettingsLinkRow>
    </>
  )
}
