import { Link } from '@/app/router'
import { useTranslation } from 'react-i18next'

import { usePipSettings } from '@/features/browser/usePipSettings'
import { Switch } from '@/shared/components/ui/switch'

export function PipSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = usePipSettings()
  if (!state) return null
  return (
    <>
      <h2 className="mb-2 text-xs font-semibold">{t('pip.settingsTitle')}</h2>
      <div
        className="mb-2 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
        data-search-id="pipPanel"
      >
        <span className="text-xs">{t('pip.enabled')}</span>
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('pip.enabled')}
        />
      </div>
      <Link
        to="/tools/browser/picture-in-picture"
        className="text-xs text-primary underline-offset-2 hover:underline"
      >
        {t('pip.settingsLink')}
      </Link>
    </>
  )
}
