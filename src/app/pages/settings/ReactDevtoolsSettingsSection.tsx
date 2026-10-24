import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { useReactDevtoolsSettings } from '@/features/developer/useReactDevtoolsSettings'
import { Switch } from '@/shared/components/ui/switch'

export function ReactDevtoolsSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useReactDevtoolsSettings()
  if (!state) return null
  return (
    <>
      <SettingsRow
        searchId="reactDevtools"
        label={t('reactDevtools.settingsTitle')}
        description={t('reactDevtools.enabledHint')}
      >
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('reactDevtools.enabled')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/developer/react-devtools">
        {t('reactDevtools.settingsLink')}
      </SettingsLinkRow>
    </>
  )
}
