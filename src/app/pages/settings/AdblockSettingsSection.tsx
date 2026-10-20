import { useTranslation } from 'react-i18next'

import { useAdblock } from '@/features/adblock/useAdblock'
import { SettingsLinkRow, SettingsRow } from '@/app/pages/settings/ui'
import { Switch } from '@/shared/components/ui/switch'

export function AdblockSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useAdblock()

  if (!state) return null

  return (
    <>
      <SettingsRow
        searchId="adblockEnabled"
        label={t('settings.adblockEnabled')}
        description={t('settings.adblockEnabledDescription')}
      >
        <Switch
          checked={state.enabled}
          onCheckedChange={(enabled) => void patch({ enabled })}
          aria-label={t('settings.adblockEnabled')}
        />
      </SettingsRow>

      <SettingsRow
        searchId="adblockYoutube"
        label={t('settings.adblockYoutube')}
        description={t('settings.adblockYoutubeDescription')}
      >
        <Switch
          checked={state.youtubeEnabled && state.lists.youtube}
          disabled={!state.enabled}
          onCheckedChange={(on) =>
            void patch({ youtubeEnabled: on, lists: { ...state.lists, youtube: on } })
          }
          aria-label={t('settings.adblockYoutube')}
        />
      </SettingsRow>

      <SettingsLinkRow to="/tools/privacy/ad-blocker">{t('settings.adblockOpenTool')}</SettingsLinkRow>
    </>
  )
}
