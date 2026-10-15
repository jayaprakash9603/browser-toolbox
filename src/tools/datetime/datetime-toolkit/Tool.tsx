import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  addDays,
  dateToTimestamp,
  diffDates,
  nowTimestamp,
  parseCron,
  parseTimestamp,
  relativeTime,
  workingDaysBetween,
} from '@/core/engines/date'
import { RefreshCwIcon } from 'lucide-react'
import { COMMON_TIMEZONES, convertToTimeZones } from '@/core/engines/timezone'
import { ToolPage } from '@/shared/components/ToolPage'
import { DateTimeField } from '@/shared/components/DateTimeField'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useDateTimeTool } from '../_shared'

const CRON_EXAMPLE = '30 9 * * 1-5'

export default function DateTimeToolkitTool() {
  const { t } = useTranslation()
  const tool = useDateTimeTool('datetime.toolkit')
  const [tab, setTab] = useState<'timestamp' | 'calc' | 'zones' | 'cron'>('timestamp')

  const [dateA, setDateA] = useState('')
  const [dateB, setDateB] = useState('')
  const [addAmountText, setAddAmountText] = useState('7')
  const addAmount = parseNumberInRange(addAmountText)

  const a = useMemo(() => (dateA ? new Date(dateA) : null), [dateA])
  const b = useMemo(() => (dateB ? new Date(dateB) : null), [dateB])
  const diff = useMemo(() => (a && b ? diffDates(a, b) : null), [a, b])
  const workDays = useMemo(() => (a && b ? workingDaysBetween(a, b) : null), [a, b])
  const added = useMemo(
    () => (a && addAmount !== null ? addDays(a, addAmount) : null),
    [a, addAmount],
  )

  const [zoneDate, setZoneDate] = useState(() => new Date().toISOString().slice(0, 16))
  const zoneBase = useMemo(() => (zoneDate ? new Date(zoneDate) : new Date()), [zoneDate])
  const zones = useMemo(
    () =>
      convertToTimeZones(
        zoneBase,
        COMMON_TIMEZONES.map((z) => z.id),
      ),
    [zoneBase],
  )

  const [cronInput, setCronInput] = useState('')
  const cron = useMemo(() => (cronInput.trim() ? parseCron(cronInput) : null), [cronInput])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="timestamp">{t('dt.tabTimestamp')}</TabsTrigger>
            <TabsTrigger value="calc">{t('dt.tabCalc')}</TabsTrigger>
            <TabsTrigger value="zones">{t('dt.tabZones')}</TabsTrigger>
            <TabsTrigger value="cron">Cron</TabsTrigger>
          </TabsList>

        <TabsContent value="timestamp" className="mt-0">
          <TimestampPanel />
        </TabsContent>

        <TabsContent value="calc" className="mt-0">
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-medium">
              {t('dt.dateA')}
              <DateTimeField value={dateA} onChange={setDateA} ariaLabel={t('dt.dateA')} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium">
              {t('dt.dateB')}
              <DateTimeField value={dateB} onChange={setDateB} ariaLabel={t('dt.dateB')} />
            </label>
            {diff && (
              <div className="space-y-1 text-[11px]">
                <Row
                  label={t('dt.diff')}
                  value={`${diff.weeks}w ${diff.days}d ${diff.hours}h ${diff.minutes}m (${diff.totalDays} ${t('dt.days')})`}
                />
                {workDays !== null && <Row label={t('dt.workingDays')} value={String(workDays)} />}
              </div>
            )}
            {a && (
              <div className="flex items-center gap-1.5 pt-1">
                <NumberField
                  value={addAmountText}
                  onChange={setAddAmountText}
                  allowNegative
                  className="w-20"
                  ariaLabel={t('dt.addDays')}
                />
                <span className="text-[11px] text-muted-foreground">{t('dt.days')}</span>
                {added && (
                  <code className="ml-auto font-mono text-[11px]">
                    {added.toISOString().slice(0, 10)}
                  </code>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="zones" className="mt-0 flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <DateTimeField value={zoneDate} onChange={setZoneDate} ariaLabel={t('dt.zoneDate')} />
            <div className="scrollbar-styled min-h-0 flex-1 space-y-1 overflow-y-auto">
              {zones.map((zone) => (
                <div
                  key={zone.timeZone}
                  className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1"
                >
                  <span className="text-[11px] text-muted-foreground">{zone.timeZone}</span>
                  <div className="text-right">
                    <code className="block font-mono text-[11px]">{zone.formatted}</code>
                    <span className="text-[11px] text-muted-foreground">{zone.offset}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cron" className="mt-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <Input
                value={cronInput}
                onChange={(e) => setCronInput(e.target.value)}
                placeholder={CRON_EXAMPLE}
                aria-label={t('dt.cronInput')}
                className="flex-1 font-mono"
              />
              <Button size="sm" variant="ghost" onClick={() => setCronInput(CRON_EXAMPLE)}>
                {t('dev.tryExample')}
              </Button>
            </div>
            {cron && !cron.ok && <JsonErrorView message={cron.error} />}
            {cron?.ok && (
              <div className="flex flex-col gap-2">
                <div className="rounded-md border bg-muted/40 p-2 text-[11px]">
                  {cron.description}
                </div>
                <div className="flex flex-wrap gap-1">
                  {cron.fields.map((field) => (
                    <Badge key={field.name} variant="outline" className="font-mono text-[11px]">
                      {field.name}: {field.raw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <code className="font-mono">{value}</code>
    </div>
  )
}

function TimestampPanel() {
  const { t } = useTranslation()
  const [tsInput, setTsInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const parsed = tsInput.trim() ? parseTimestamp(tsInput) : null
  const fromDate = dateInput.trim() ? new Date(dateInput) : null
  const validDate = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null

  return (
    <Tabs defaultValue="toDate">
      <TabsList>
        <TabsTrigger value="toDate">{t('dev.tabToDate')}</TabsTrigger>
        <TabsTrigger value="toTimestamp">{t('dev.tabToTimestamp')}</TabsTrigger>
        <TabsTrigger value="now">{t('dev.tabNow')}</TabsTrigger>
      </TabsList>
      <TabsContent value="toDate" className="mt-2 space-y-2">
        <Input
          value={tsInput}
          onChange={(e) => setTsInput(e.target.value)}
          placeholder="1743256800"
          aria-label={t('dev.timestampInput')}
          className="font-mono"
        />
        {parsed && !parsed.ok && <JsonErrorView message={parsed.error} />}
        {parsed?.ok && (
          <div className="space-y-1">
            <Row label={t('dev.iso')} value={parsed.value.date.toISOString()} />
            <Row label={t('dev.local')} value={parsed.value.date.toLocaleString()} />
            <Row label={t('dev.relative')} value={relativeTime(parsed.value.date)} />
          </div>
        )}
      </TabsContent>
      <TabsContent value="toTimestamp" className="mt-2 space-y-2">
        <DateTimeField value={dateInput} onChange={setDateInput} ariaLabel={t('dev.dateInput')} />
        {dateInput.trim() && !validDate && <JsonErrorView message={t('dev.invalidDate')} />}
        {validDate && (
          <div className="space-y-1">
            <Row label={t('dev.unixSeconds')} value={String(dateToTimestamp(validDate, 'seconds'))} />
            <Row
              label={t('dev.unixMillis')}
              value={String(dateToTimestamp(validDate, 'milliseconds'))}
            />
          </div>
        )}
      </TabsContent>
      <TabsContent value="now" className="mt-2">
        <NowTimestampPanel />
      </TabsContent>
    </Tabs>
  )
}

function NowTimestampPanel() {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => new Date())
  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" className="w-fit" onClick={() => setNow(new Date())}>
        <RefreshCwIcon /> {t('dev.refreshNow')}
      </Button>
      <Row label={t('dev.unixSeconds')} value={String(nowTimestamp('seconds'))} />
      <Row label={t('dev.unixMillis')} value={String(nowTimestamp('milliseconds'))} />
      <Row label={t('dev.iso')} value={now.toISOString()} />
    </div>
  )
}
