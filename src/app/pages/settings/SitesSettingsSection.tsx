import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { useWhatsappSettings } from '@/features/sites/useWhatsappSettings'
import { useYoutubeSettings } from '@/features/sites/useYoutubeSettings'
import { Switch } from '@/shared/components/ui/switch'

export function SitesSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useYoutubeSettings()
  const { state: waState, patch: waPatch } = useWhatsappSettings()
  if (!state || !waState) return null
  return (
    <>
      <SettingsRow searchId="youtubePanel" label={t('sites.youtube.settings.title')}>
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('sites.youtube.settings.title')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/sites/youtube">{t('sites.youtube.settings.link')}</SettingsLinkRow>
      <SettingsRow searchId="whatsappPanel" label={t('sites.whatsapp.settings.title')}>
        <Switch
          checked={waState.enabled}
          onCheckedChange={(on) => void waPatch({ enabled: on })}
          aria-label={t('sites.whatsapp.settings.title')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/sites/whatsapp">{t('sites.whatsapp.settings.link')}</SettingsLinkRow>
    </>
  )
}
