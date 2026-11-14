import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  describePermission,
  permissionStateFrom,
  queryPagePermissionsWorld,
  siteSettingsUrl,
  type SitePermissionStatus,
} from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { useActiveTabContext } from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge, resultTone } from './ui'

export function PermissionsTab() {
  const { t } = useTranslation()
  const { context } = useActiveTabContext()
  const [rows, setRows] = useState<SitePermissionStatus[] | null>(null)
  const [busy, setBusy] = useState(false)
  const settingsUrl = siteSettingsUrl(context.url)

  const probe = async () => {
    if (context.tabId == null || context.restricted) return
    setBusy(true)
    try {
      const injected = await chrome.scripting.executeScript({
        target: { tabId: context.tabId },
        func: queryPagePermissionsWorld,
      })
      const value = injected[0]?.result
      setRows(Array.isArray(value) ? value.map((row) => describePermission(row.permission, permissionStateFrom(row.state))) : [])
    } catch {
      setRows([])
    } finally {
      setBusy(false)
    }
  }

  const openSettings = () => {
    if (!settingsUrl) return
    void chrome.tabs.create({ url: settingsUrl })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CapsLabel>Site permissions</CapsLabel>
          <p className="text-sm text-muted-foreground">Queried through the page Permissions API. This extension cannot always change them.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={busy || context.restricted} onClick={() => void probe()}>
            Inspect
          </Button>
          <Button size="sm" variant="outline" disabled={!settingsUrl} onClick={openSettings}>
            {t('securityCenter.openSiteSettings', 'Open site settings')}
          </Button>
        </div>
      </Panel>
      <Panel className="space-y-2">
        {(rows ?? []).map((row) => (
          <div key={row.permission} className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.howToManage}</p>
            </div>
            <StatusBadge label={row.state.replaceAll('_', ' ')} tone={resultTone(row.state)} />
          </div>
        ))}
        {rows == null ? <EmptyNote>Inspect the active tab to query camera, microphone, location and related permissions.</EmptyNote> : null}
        {rows?.length === 0 ? <EmptyNote>No permission states were returned for this tab.</EmptyNote> : null}
      </Panel>
    </div>
  )
}
