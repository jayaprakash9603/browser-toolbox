import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { usePipSettings } from '@/features/browser/usePipSettings'
import { Switch } from '@/shared/components/ui/switch'

export function PipSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = usePipSettings()
  if (!state) return null
  return (
    <>
      <SettingsRow searchId="pipPanel" label={t('pip.settingsTitle')} description={t('pip.enabled')}>
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('pip.enabled')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/browser/picture-in-picture">{t('pip.settingsLink')}</SettingsLinkRow>
    </>
  )
}
