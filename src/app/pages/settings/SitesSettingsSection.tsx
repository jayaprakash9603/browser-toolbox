import { useTranslation } from 'react-i18next'

import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { useInstagramSettings } from '@/features/sites/useInstagramSettings'
import { useWhatsappSettings } from '@/features/sites/useWhatsappSettings'
import { useYoutubeSettings } from '@/features/sites/useYoutubeSettings'
import { Switch } from '@/shared/components/ui/switch'

export function SitesSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useYoutubeSettings()
  const { state: waState, patch: waPatch } = useWhatsappSettings()
  const { state: igState, patch: igPatch } = useInstagramSettings()
  if (!state || !waState || !igState) return null
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
      <SettingsRow searchId="instagramPanel" label={t('sites.instagram.header.title')}>
        <Switch
          checked={igState.enabled}
          onCheckedChange={(on) => void igPatch({ enabled: on })}
          aria-label={t('sites.instagram.header.title')}
        />
      </SettingsRow>
      <SettingsLinkRow to="/tools/sites/instagram">{t('sites.instagram.settings.link')}</SettingsLinkRow>
    </>
  )
}
