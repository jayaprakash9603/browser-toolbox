import { useTranslation } from 'react-i18next'

import { SettingsRow } from '@/app/pages/settings/ui'
import {
  ALL_SITES_ORIGINS,
  requestAllSitesAccess,
  revokeAllSitesAccess,
} from '@/core/permissions/siteAccess'
import { usePermissionGranted } from '@/features/site-access/usePermissionGranted'
import { Button } from '@/shared/components/ui/button'

export function SiteAccessSettingsSection() {
  const { t } = useTranslation()
  const granted = usePermissionGranted({ origins: ALL_SITES_ORIGINS })
  if (granted === null) return null
  return (
    <SettingsRow
      searchId="siteAccess"
      label={t('settings.siteAccessAll')}
      description={granted ? t('settings.siteAccessAllOn') : t('settings.siteAccessAllOff')}
    >
      {granted ? (
        <Button type="button" size="sm" variant="outline" onClick={() => void revokeAllSitesAccess()}>
          {t('settings.siteAccessRevoke')}
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => void requestAllSitesAccess()}>
          {t('settings.siteAccessGrant')}
        </Button>
      )}
    </SettingsRow>
  )
}
