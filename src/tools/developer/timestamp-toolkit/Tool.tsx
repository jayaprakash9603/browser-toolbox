import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { dateToTimestamp, nowTimestamp, parseTimestamp, relativeTime } from '@/core/engines/date'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions } from '@/tools/text/_shared'
import { JsonErrorView, useDevTool } from '../_shared'

export default function TimestampToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.timestamp-toolkit')
  const [tsInput, setTsInput] = useState('')
  const [dateInput, setDateInput] = useState('')

  const parsed = useMemo(() => (tsInput.trim() ? parseTimestamp(tsInput) : null), [tsInput])
  const fromDate = useMemo(() => {
    if (!dateInput.trim()) return null
    const date = new Date(dateInput)
    return Number.isNaN(date.getTime()) ? null : date
  }, [dateInput])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Tabs defaultValue="toDate">
          <TabsList>
            <TabsTrigger value="toDate">{t('dev.tabToDate')}</TabsTrigger>
            <TabsTrigger value="toTimestamp">{t('dev.tabToTimestamp')}</TabsTrigger>
            <TabsTrigger value="now">{t('dev.tabNow')}</TabsTrigger>
          </TabsList>

          <TabsContent value="toDate" className="mt-2">
            <div className="flex flex-col gap-2">
              <Input value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="1743256800" aria-label={t('dev.timestampInput')} className="font-mono" />
              {parsed && !parsed.ok && <JsonErrorView message={parsed.error} />}
              {parsed?.ok && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2">
                    <span className="text-xs text-muted-foreground">{t('dev.detectedAs')}</span>
                    <span className="text-xs font-medium">{parsed.value.kind === 'seconds' ? t('dev.unixSeconds') : t('dev.unixMillis')}</span>
                  </div>
                  <ResultRow label={t('dev.iso')} value={parsed.value.date.toISOString()} />
                  <ResultRow label={t('dev.local')} value={parsed.value.date.toLocaleString()} />
                  <ResultRow label={t('dev.utc')} value={parsed.value.date.toUTCString()} />
                  <ResultRow label={t('dev.relative')} value={relativeTime(parsed.value.date)} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="toTimestamp" className="mt-2">
            <div className="flex flex-col gap-2">
              <Input type="datetime-local" value={dateInput} onChange={(e) => setDateInput(e.target.value)} aria-label={t('dev.dateInput')} />
              {dateInput.trim() && !fromDate && <JsonErrorView message={t('dev.invalidDate')} />}
              {fromDate && (
                <div className="space-y-1.5">
                  <ResultRow label={t('dev.unixSeconds')} value={String(dateToTimestamp(fromDate, 'seconds'))} />
                  <ResultRow label={t('dev.unixMillis')} value={String(dateToTimestamp(fromDate, 'milliseconds'))} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="now" className="mt-2">
            <NowPanel />
          </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}

function NowPanel() {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => new Date())
  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" className="w-fit" onClick={() => setNow(new Date())}>
        <RefreshCwIcon /> {t('dev.refreshNow')}
      </Button>
      <ResultRow label={t('dev.unixSeconds')} value={String(nowTimestamp('seconds'))} />
      <ResultRow label={t('dev.unixMillis')} value={String(nowTimestamp('milliseconds'))} />
      <ResultRow label={t('dev.iso')} value={now.toISOString()} />
      <ResultRow label={t('dev.local')} value={now.toLocaleString()} />
    </div>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <code className="font-mono text-[11px]">{value}</code>
        <ToolActions value={value} onClear={() => undefined} />
      </div>
    </div>
  )
}
