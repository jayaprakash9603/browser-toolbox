import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import type { RedirectHop } from '@/core/web/redirectTrace'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { useWebTool } from '../_shared'
import { getActiveTabId } from '../tabMessaging'

export default function RedirectTracerTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.redirect-tracer')
  const [hops, setHops] = useState<RedirectHop[]>([])

  const refresh = async () => {
    const tabId = await getActiveTabId()
    const data = await sendMessage<RedirectHop[]>({ type: 'REDIRECT_TRACE_GET', tabId: tabId ?? undefined })
    setHops(data ?? [])
  }

  const clear = async () => {
    const tabId = await getActiveTabId()
    await sendMessage({ type: 'REDIRECT_TRACE_CLEAR', tabId: tabId ?? undefined })
    setHops([])
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <ToolPage tool={tool}>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => void refresh()}>{t('common.tryAgain')}</Button>
        <Button size="sm" variant="ghost" onClick={() => void clear()}>{t('common.clear')}</Button>
      </div>
      <ol className="mt-3 flex flex-col gap-2 text-xs">
        {hops.map((hop, i) => (
          <li key={`${hop.at}-${i}`} className="rounded-md border p-2">
            <span className="text-muted-foreground">#{i + 1}</span>
            {hop.statusCode != null && <span className="ml-2 font-mono">{hop.statusCode}</span>}
            <p className="mt-1 break-all">{hop.url}</p>
          </li>
        ))}
      </ol>
      {hops.length === 0 && <p className="mt-2 text-xs text-muted-foreground">{t('web.redirectTracer.empty')}</p>}
    </ToolPage>
  )
}
