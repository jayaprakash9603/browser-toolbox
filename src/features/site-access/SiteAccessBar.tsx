import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LockKeyholeIcon } from 'lucide-react'

import { requestAllSitesAccess, requestSiteAccess } from '@/core/permissions/siteAccess'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

import { useActiveTabAccess } from './useActiveTabAccess'

/** Shown above page tools when Chrome has not given One Panel access to the current tab. */
export function SiteAccessBar() {
  const { t } = useTranslation()
  const access = useActiveTabAccess()
  const [busy, setBusy] = useState(false)

  if (!access || access.granted) return null

  const allow = async (allSites: boolean) => {
    setBusy(true)
    try {
      await (allSites ? requestAllSitesAccess() : requestSiteAccess(access.url))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Alert className="shrink-0 rounded-none border-x-0 border-t-0 py-2">
      <LockKeyholeIcon aria-hidden />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{t('siteAccess.barMessage', { host: access.host })}</span>
        <span className="flex shrink-0 gap-1.5">
          <Button type="button" size="xs" disabled={busy} onClick={() => void allow(false)}>
            {t('siteAccess.allowSite')}
          </Button>
          <Button type="button" size="xs" variant="outline" disabled={busy} onClick={() => void allow(true)}>
            {t('siteAccess.allowAll')}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  )
}
