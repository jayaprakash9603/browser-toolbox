import { useEffect, useState } from 'react'

import { onSiteAccessChanged } from '@/core/permissions/siteAccess'

/** Live view of whether the extension holds the given optional permissions; null while loading. */
export function usePermissionGranted(request: chrome.permissions.Permissions): boolean | null {
  const [granted, setGranted] = useState<boolean | null>(null)
  const key = JSON.stringify(request)

  useEffect(() => {
    let active = true
    const parsed = JSON.parse(key) as chrome.permissions.Permissions
    const check = () => {
      void chrome.permissions
        .contains(parsed)
        .then((value) => active && setGranted(value))
        .catch(() => active && setGranted(false))
    }
    check()
    const stop = onSiteAccessChanged(check)
    return () => {
      active = false
      stop()
    }
  }, [key])

  return granted
}
