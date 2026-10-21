import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { useDesignTool } from '../_shared'
import { sendToActiveTab } from '@/tools/web/tabMessaging'

export default function FontInspectorTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.font-inspector')
  const [on, setOn] = useState(false)

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
