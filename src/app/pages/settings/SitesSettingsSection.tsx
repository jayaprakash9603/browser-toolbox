import { Link } from '@/app/router'
import { useTranslation } from 'react-i18next'

import { useYoutubeSettings } from '@/features/sites/useYoutubeSettings'
import { Switch } from '@/shared/components/ui/switch'

export function SitesSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useYoutubeSettings()
  if (!state) return null
  return (
    <>
      <h2 className="mb-2 text-xs font-semibold">{t('sites.youtube.settings.title')}</h2>
      <div
        className="mb-2 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
        data-search-id="youtubePanel"
      >
        <span className="text-xs">{t('sites.youtube.settings.title')}</span>
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('sites.youtube.settings.title')}
        />
      </div>
      <Link to="/tools/sites/youtube" className="text-xs text-primary underline-offset-2 hover:underline">
        {t('sites.youtube.settings.link')}
      </Link>
    </>
  )
}
