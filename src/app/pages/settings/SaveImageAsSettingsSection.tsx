import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { useSaveImageAsSettings } from '@/features/image/useSaveImageAsSettings'
import { Switch } from '@/shared/components/ui/switch'

export function SaveImageAsSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useSaveImageAsSettings()
  if (!state) return null
  return (
    <>
      <SettingsRow searchId="saveImageAsPanel" label={t('saveImageAs.settingsTitle')} description={t('saveImageAs.enabled')}>
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('saveImageAs.enabled')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/image/save-as-type">{t('saveImageAs.settingsLink')}</SettingsLinkRow>
    </>
  )
}
