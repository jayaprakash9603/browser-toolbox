import { useTranslation } from 'react-i18next'
import { LockKeyholeIcon } from 'lucide-react'

import { ALL_SITES_ORIGINS, requestPermissions } from '@/core/permissions/siteAccess'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

import { usePermissionGranted } from './usePermissionGranted'

interface PermissionNoticeProps {
  /** Only nag while the feature that needs the permission is switched on. */
  active: boolean
  message: string
  origins?: string[]
  permissions?: chrome.runtime.ManifestPermission[]
}

export function PermissionNotice({
  active,
  message,
  origins = ALL_SITES_ORIGINS,
  permissions,
}: PermissionNoticeProps) {
  const { t } = useTranslation()
  const request: chrome.permissions.Permissions = permissions ? { origins, permissions } : { origins }
  const granted = usePermissionGranted(request)

  if (!active || granted !== false) return null

  return (
    <Alert className="py-2">
      <LockKeyholeIcon aria-hidden />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{message}</span>
        <Button type="button" size="xs" onClick={() => void requestPermissions(request)}>
          {t('siteAccess.allow')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
