import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { useProtection } from '@/features/protection/useProtection'
import { Switch } from '@/shared/components/ui/switch'

export function ProtectionSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useProtection()

  if (!state) return null

  return (
    <>
      <SettingsRow
        searchId="protectionEnabled"
        label={t('settings.protectionEnabled')}
        description={t('settings.protectionEnabledDescription')}
      >
        <Switch
          checked={state.enabled}
          onCheckedChange={(enabled) => void patch({ enabled })}
          aria-label={t('settings.protectionEnabled')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/privacy/web-protection">{t('settings.protectionOpenTool')}</SettingsLinkRow>
    </>
  )
}
