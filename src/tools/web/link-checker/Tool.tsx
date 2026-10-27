import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sendMessage } from '@/core/messaging'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'
import type { LinkCheckResult } from '@/core/engines/linkChecker/check'
import { summarizeResults } from '@/core/engines/linkChecker/check'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { useWebTool, getPageInfo } from '../_shared'

export default function LinkCheckerTool() {
  const { t } = useTranslation()
  const tool = useWebTool('web.link-checker')
  const [results, setResults] = useState<LinkCheckResult[]>([])
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    await requestAllSitesAccess()
    const info = await getPageInfo()
    const unique = new Map<string, string>()
    for (const link of info?.links ?? []) {
      if (!link.href.startsWith('http')) continue
      if (!unique.has(link.href)) unique.set(link.href, link.text)
    }
    const items = [...unique.entries()].slice(0, 80).map(([href, text]) => ({ href, text }))
    const data = await sendMessage<LinkCheckResult[]>({ type: 'CHECK_HTTP_URLS', items })
    setResults(data ?? [])
    setRunning(false)
  }

  const summary = summarizeResults(results)

  return (
    <ToolPage tool={tool}>
      <Button size="sm" onClick={() => void run()} disabled={running}>
        {running ? t('web.linkChecker.running') : t('web.linkChecker.run')}
      </Button>
      {results.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('web.linkChecker.summary', { total: summary.total, broken: summary.broken })}
        </p>
      )}
      <ul className="mt-3 flex max-h-[60vh] flex-col gap-2 overflow-auto text-xs">
        {results.map((r) => (
          <li key={r.href} className="rounded-md border p-2">
            <div className="flex items-center gap-2">
              <Badge variant={r.ok ? 'secondary' : 'destructive'}>{r.status ?? 'ERR'}</Badge>
              <span className="truncate">{r.text || r.href}</span>
            </div>
            <p className="mt-1 break-all text-muted-foreground">{r.href}</p>
          </li>
        ))}
      </ul>
    </ToolPage>
  )
}
