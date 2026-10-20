import { Link } from '@/app/router'
import { useTranslation } from 'react-i18next'

import { useSaveImageAsSettings } from '@/features/image/useSaveImageAsSettings'
import { Switch } from '@/shared/components/ui/switch'

export function SaveImageAsSettingsSection() {
  const { t } = useTranslation()
  const { state, patch } = useSaveImageAsSettings()
  if (!state) return null
  return (
    <>
      <h2 className="mb-2 text-xs font-semibold">{t('saveImageAs.settingsTitle')}</h2>
      <div
        className="mb-2 flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
        data-search-id="saveImageAsPanel"
      >
        <span className="text-xs">{t('saveImageAs.enabled')}</span>
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('saveImageAs.enabled')}
        />
      </div>
      <Link to="/tools/image/save-as-type" className="text-xs text-primary underline-offset-2 hover:underline">
        {t('saveImageAs.settingsLink')}
      </Link>
    </>
  )
}
