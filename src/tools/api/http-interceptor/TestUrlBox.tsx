import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InterceptorRule, TestRuleResult } from '@/core/interceptor'
import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

interface Props {
  rules: InterceptorRule[]
}

export function TestUrlBox({ rules }: Props) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('https://')
  const [result, setResult] = useState<TestRuleResult | null>(null)

  const run = async () => {
    const data = await sendMessage<TestRuleResult>({ type: 'INTERCEPTOR_TEST_RULE', url })
    setResult(data ?? null)
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('interceptor.testUrl')}</p>
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono text-xs" />
        <Button type="button" variant="secondary" size="sm" onClick={() => void run()}>
          {t('interceptor.testRun')}
        </Button>
      </div>
      {result && (
        <p className="mt-2 text-xs text-muted-foreground">
          {result.matches ? 'Matches' : 'No match'}
          {result.transformedUrl ? ` → ${result.transformedUrl}` : ''}
          {result.matchedRules.length ? ` (${result.matchedRules.length} rules)` : ''}
        </p>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">{rules.length} rules loaded</p>
    </div>
  )
}
