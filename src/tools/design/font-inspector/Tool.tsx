import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FONT_INSPECTOR_SESSION_KEY } from '@/core/design/fontInspectorState'
import { sendMessage } from '@/core/messaging/messageService'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { useDesignTool } from '../_shared'

async function readPanelFontState(): Promise<boolean> {
  const data = await sendMessage<{ enabled: boolean; tabId: number | null }>({
    type: 'FONT_INSPECTOR_PANEL_GET',
  })
  return Boolean(data?.enabled)
}

export default function FontInspectorTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.font-inspector')
  const [on, setOn] = useState(false)

  const syncFromActiveTab = useCallback(async () => {
    const enabled = await readPanelFontState()
    setOn(enabled)
  }, [])

  useEffect(() => {
    void syncFromActiveTab()
    const tabs = chrome.tabs
    const refresh = () => void syncFromActiveTab()
    tabs?.onActivated?.addListener(refresh)
    tabs?.onUpdated?.addListener(refresh)
    const onSession = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: 'sync' | 'local' | 'managed' | 'session',
    ) => {
      if (area === 'session' && changes[FONT_INSPECTOR_SESSION_KEY]) void syncFromActiveTab()
    }
    chrome.storage.onChanged.addListener(onSession)
    return () => {
      tabs?.onActivated?.removeListener(refresh)
      tabs?.onUpdated?.removeListener(refresh)
      chrome.storage.onChanged.removeListener(onSession)
    }
  }, [syncFromActiveTab])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncFromActiveTab()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [syncFromActiveTab])

  const toggle = async (enabled: boolean) => {
    setOn(enabled)
    await sendMessage({ type: 'FONT_INSPECTOR_PANEL_SET', enabled })
    void syncFromActiveTab()
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">{t('design.fontInspector.title')}</p>
          <p className="text-[11px] text-muted-foreground">{t('design.fontInspector.subtitle')}</p>
        </div>
        <Switch checked={on} onCheckedChange={(v) => void toggle(v)} aria-label={t('design.fontInspector.title')} />
      </div>
    </ToolPage>
  )
}
