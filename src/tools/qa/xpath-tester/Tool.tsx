import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlayIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useQaTool } from '../_shared'

interface MatchInfo {
  count: number
  samples: string[]
}

export default function XpathTesterTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.xpath-tester')
  const [xpath, setXpath] = useState('')
  const [result, setResult] = useState<MatchInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    if (!xpath.trim()) return
    setRunning(true)
    setError(null)
    setResult(null)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id == null) { setRunning(false); setError(t('qa.noActiveTab')); return }
    try {
      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (expression: string): MatchInfo => {
          const snapshot = document.evaluate(expression, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
          const samples: string[] = []
          for (let index = 0; index < Math.min(snapshot.snapshotLength, 5); index += 1) {
            const node = snapshot.snapshotItem(index)
            if (node instanceof Element) {
              const tag = node.tagName.toLowerCase()
              const id = node.id ? `#${node.id}` : ''
              samples.push(`${tag}${id}`)
            }
          }
          return { count: snapshot.snapshotLength, samples }
        },
        args: [xpath],
      })
      const value = response[0]?.result
      if (value) setResult(value)
      else setError(t('qa.noMatch'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.split('\n')[0] : t('qa.xpathError'))
    }
    setRunning(false)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Input value={xpath} onChange={(e) => setXpath(e.target.value)} placeholder="//div[@id='main']" aria-label={t('qa.xpathInput')} className="flex-1 font-mono" />
          <Button size="sm" onClick={() => void run()} disabled={!xpath.trim() || running}>
            <PlayIcon /> {t('qa.test')}
          </Button>
        </div>
        {error && <JsonErrorView message={error} />}
        {result && (
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">{t('qa.matchCount', { count: result.count })}</Badge>
            {result.samples.length > 0 && (
              <div className="space-y-1">
                {result.samples.map((sample) => (
                  <code key={sample} className="block rounded border bg-muted/40 px-2 py-1 font-mono text-[11px]">{sample}</code>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
