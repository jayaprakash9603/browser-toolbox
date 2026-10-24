import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRightIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CalendarRangeIcon,
  ClockIcon,
  HashIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  SunIcon,
  TimerIcon,
} from 'lucide-react'

import { DateTimeField, formatDateTimeValue, parseDateTimeValue } from '@/shared/components/DateTimeField'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { SectionCard, ValueCard, ValueGrid } from '@/shared/components/ValueCard'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'

import {
  addDuration,
  calendarDiff,
  dateFormats,
  isoWeek,
  relativeDayLabel,
  type Duration,
} from './dateModel'
import { Chip, EmptyHint, FieldLabel } from './parts'

type CalcMode = 'diff' | 'add'
const DURATION_FIELDS: (keyof Duration)[] = ['years', 'months', 'weeks', 'days', 'hours', 'minutes']
const EMPTY_DURATION: Record<keyof Duration, string> = {
  years: '0',
  months: '0',
  weeks: '0',
  days: '7',
  hours: '0',
  minutes: '0',
}
const QUICK_ADDS: { id: string; value: Partial<Record<keyof Duration, string>> }[] = [
  { id: 'd1', value: { days: '1' } },
  { id: 'w1', value: { weeks: '1' } },
  { id: 'd30', value: { days: '30' } },
  { id: 'd90', value: { days: '90' } },
  { id: 'm6', value: { months: '6' } },
  { id: 'y1', value: { years: '1' } },
]
const MAX_AMOUNT = 100_000

const number = new Intl.NumberFormat()

export function CalculatorPanel() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<CalcMode>('diff')
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        ariaLabel={t('dtk.calcMode')}
        value={mode}
        onValueChange={setMode}
        className="w-full [&>button]:flex-1"
        options={[
          { value: 'diff', label: <><CalendarRangeIcon />{t('dtk.calcDiff')}</> },
          { value: 'add', label: <><CalendarPlusIcon />{t('dtk.calcAdd')}</> },
        ]}
      />
      {mode === 'diff' ? <DifferenceView /> : <AddView />}
    </div>
  )
}

function DifferenceView() {
  const { t } = useTranslation()
  const [dateA, setDateA] = useState(() => formatDateTimeValue(new Date()))
  const [dateB, setDateB] = useState('')
  const a = parseDateTimeValue(dateA)
  const b = parseDateTimeValue(dateB)
  const diff = a && b ? calendarDiff(a, b) : null

  const parts = diff
    ? (
        [
          ['years', diff.years],
          ['months', diff.months],
          ['days', diff.days],
          ['hours', diff.hours],
          ['minutes', diff.minutes],
        ] as const
      ).filter(([, value]) => value > 0)
    : []
  const headline = parts.length
    ? parts.map(([unit, value]) => t(`dtk.unitCount.${unit}`, { count: value })).join(', ')
    : t('dtk.sameMoment')

  return (
    <>
      <SectionCard
        icon={CalendarRangeIcon}
        title={t('dtk.calcDiff')}
        description={t('dtk.calcDiffHint')}
        actions={
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setDateA(formatDateTimeValue(new Date()))
              setDateB('')
            }}
            aria-label={t('dtk.reset')}
            title={t('dtk.reset')}
          >
            <RotateCcwIcon />
          </Button>
        }
      >
        <div className="@container">
          <div className="grid grid-cols-1 items-end gap-2 @md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <FieldLabel label={t('dtk.from')}>
              <DateTimeField value={dateA} onChange={setDateA} ariaLabel={t('dtk.from')} />
            </FieldLabel>
            <Button
              variant="outline"
              size="icon"
              className="mx-auto size-9 rotate-90 @md:rotate-0"
              onClick={() => {
                setDateA(dateB)
                setDateB(dateA)
              }}
              aria-label={t('dtk.swap')}
              title={t('dtk.swap')}
            >
              <ArrowLeftRightIcon />
            </Button>
            <FieldLabel label={t('dtk.to')}>
              <DateTimeField
                value={dateB}
                onChange={setDateB}
                ariaLabel={t('dtk.to')}
                placeholder={t('dtk.pickSecond')}
              />
            </FieldLabel>
          </div>
        </div>
      </SectionCard>

      {diff ? (
        <>
          <div className="rounded-xl border border-primary/30 bg-primary/[0.05] px-3.5 py-3">
            <div className="text-xs font-medium text-muted-foreground">
              {diff.direction === 0
                ? t('dtk.dirSame')
                : diff.direction > 0
                  ? t('dtk.dirAfter')
                  : t('dtk.dirBefore')}
            </div>
            <div className="mt-0.5 text-lg leading-7 font-semibold">{headline}</div>
          </div>
          <ValueGrid columns={3}>
            <ValueCard icon={CalendarIcon} label={t('dtk.total.days')} value={number.format(diff.totalDays)} copyText={String(diff.totalDays)} />
            <ValueCard icon={CalendarRangeIcon} label={t('dtk.total.weeks')} value={number.format(diff.totalWeeks)} copyText={String(diff.totalWeeks)} />
            <ValueCard icon={ClockIcon} label={t('dtk.total.hours')} value={number.format(diff.totalHours)} copyText={String(diff.totalHours)} />
            <ValueCard icon={TimerIcon} label={t('dtk.total.minutes')} value={number.format(diff.totalMinutes)} copyText={String(diff.totalMinutes)} />
            <ValueCard icon={HashIcon} label={t('dtk.total.seconds')} value={number.format(diff.totalSeconds)} copyText={String(diff.totalSeconds)} />
            <ValueCard icon={CalendarCheckIcon} label={t('dtk.total.calendarDays')} value={number.format(diff.calendarDays)} copyText={String(diff.calendarDays)} hint={t('dtk.inclusive')} />
            <ValueCard emphasis icon={BriefcaseIcon} label={t('dtk.total.workingDays')} value={number.format(diff.workingDays)} copyText={String(diff.workingDays)} hint={t('dtk.monFri')} />
            <ValueCard icon={SunIcon} label={t('dtk.total.weekendDays')} value={number.format(diff.weekendDays)} copyText={String(diff.weekendDays)} />
          </ValueGrid>
        </>
      ) : (
        <EmptyHint icon={CalendarRangeIcon}>{t('dtk.diffEmpty')}</EmptyHint>
      )}
    </>
  )
}

function AddView() {
  const { t } = useTranslation()
  const [start, setStart] = useState(() => formatDateTimeValue(new Date()))
  const [direction, setDirection] = useState<'add' | 'subtract'>('add')
  const [amounts, setAmounts] = useState(EMPTY_DURATION)
  const [business, setBusiness] = useState(false)

  const base = parseDateTimeValue(start)
  const duration = useMemo(() => {
    const parsed = {} as Duration
    for (const field of DURATION_FIELDS) {
      const value = parseNumberInRange(amounts[field] || '0', 0, MAX_AMOUNT)
      if (value === null) return null
      parsed[field] = Math.trunc(value)
    }
    return parsed
  }, [amounts])
  const result =
    base && duration ? addDuration(base, duration, direction === 'add' ? 1 : -1, business) : null

  return (
    <>
      <SectionCard
        icon={CalendarPlusIcon}
        title={t('dtk.calcAdd')}
        description={t('dtk.calcAddHint')}
        bodyClassName="flex flex-col gap-3"
        actions={
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setAmounts({ ...EMPTY_DURATION, days: '0' })
              setBusiness(false)
            }}
            aria-label={t('dtk.reset')}
            title={t('dtk.reset')}
          >
            <RotateCcwIcon />
          </Button>
        }
      >
        <div className="@container">
          <div className="grid grid-cols-1 items-end gap-2 @md:grid-cols-[minmax(0,1fr)_auto]">
            <FieldLabel label={t('dtk.startDate')}>
              <DateTimeField value={start} onChange={setStart} ariaLabel={t('dtk.startDate')} />
            </FieldLabel>
            <Segmented
              ariaLabel={t('dtk.direction')}
              value={direction}
              onValueChange={setDirection}
              className="h-9"
              options={[
                { value: 'add', label: <><PlusIcon />{t('dtk.add')}</> },
                { value: 'subtract', label: <><MinusIcon />{t('dtk.subtract')}</> },
              ]}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_FIELDS.map((field) => (
            <FieldLabel key={field} label={t(`dtk.field.${field}`)}>
              <NumberField
                value={amounts[field]}
                onChange={(value) => setAmounts((current) => ({ ...current, [field]: value }))}
                ariaLabel={t(`dtk.field.${field}`)}
                max={MAX_AMOUNT}
                min={0}
                className="h-9"
              />
            </FieldLabel>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADDS.map((quick) => (
            <Chip
              key={quick.id}
              onClick={() => setAmounts({ ...EMPTY_DURATION, days: '0', ...quick.value })}
            >
              {direction === 'add' ? '+' : '−'}
              {t(`dtk.quick.${quick.id}`)}
            </Chip>
          ))}
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="min-w-0">
            <span className="block text-[13px] font-medium">{t('dtk.businessDays')}</span>
            <span className="block text-xs text-muted-foreground">{t('dtk.businessDaysHint')}</span>
          </span>
          <Switch checked={business} onCheckedChange={setBusiness} aria-label={t('dtk.businessDays')} />
        </label>
      </SectionCard>

      {result ? (
        <ResultSummary date={result} />
      ) : (
        <EmptyHint icon={CalendarPlusIcon}>{t('dtk.addEmpty')}</EmptyHint>
      )}
    </>
  )
}

function ResultSummary({ date }: { date: Date }) {
  const { t } = useTranslation()
  const formats = dateFormats(date)
  const week = isoWeek(date)
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-xl border border-primary/30 bg-primary/[0.05] px-3.5 py-3">
        <div className="text-xs font-medium text-muted-foreground">{t('dtk.resultDate')}</div>
        <div className="mt-0.5 text-lg leading-7 font-semibold">
          {date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
        </div>
        <div className="text-xs text-muted-foreground">{relativeDayLabel(date)}</div>
      </div>
      <ValueGrid>
        <ValueCard icon={CalendarIcon} label={t('dtk.fmt.dateOnly')} value={formats.isoLocal.slice(0, 10)} />
        <ValueCard icon={HashIcon} label={t('dtk.fmt.unixSeconds')} value={formats.unixSeconds} />
        <ValueCard label={t('dtk.fmt.iso')} value={formats.iso} />
        <ValueCard
          label={t('dtk.detail.week')}
          value={t('dtk.detail.weekValue', { week: week.week, year: week.year })}
          mono={false}
        />
      </ValueGrid>
    </div>
  )
}
