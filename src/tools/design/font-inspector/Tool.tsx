import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { useDesignTool } from '../_shared'
import { sendToActiveTab } from '@/tools/web/tabMessaging'

async function readFontInspectorOnTab(): Promise<boolean> {
  const data = await sendToActiveTab<{ enabled: boolean }>({ type: 'FONT_INSPECTOR_GET' })
  return Boolean(data?.enabled)
}

export default function FontInspectorTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.font-inspector')
  const [on, setOn] = useState(false)

  const syncFromActiveTab = useCallback(async () => {
    const enabled = await readFontInspectorOnTab()
    setOn(enabled)
  }, [])

  useEffect(() => {
    void syncFromActiveTab()
    const tabs = chrome.tabs
    if (!tabs?.onActivated && !tabs?.onUpdated) return
    const refresh = () => void syncFromActiveTab()
    tabs.onActivated?.addListener(refresh)
    tabs.onUpdated?.addListener(refresh)
    return () => {
      tabs.onActivated?.removeListener(refresh)
      tabs.onUpdated?.removeListener(refresh)
    }
  }, [syncFromActiveTab])

  const toggle = async (enabled: boolean) => {
    setOn(enabled)
    await sendToActiveTab({ type: 'FONT_INSPECTOR_TOGGLE', enabled })
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
