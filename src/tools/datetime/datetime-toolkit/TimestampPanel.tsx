import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownToLineIcon,
  CalendarDaysIcon,
  ClipboardPasteIcon,
  ClockIcon,
  DatabaseIcon,
  GlobeIcon,
  HashIcon,
  HistoryIcon,
  MapPinIcon,
  PauseIcon,
  PlayIcon,
  ServerIcon,
  XIcon,
} from 'lucide-react'

import { readClipboardText } from '@/core/clipboard'
import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'
import { CopyButton } from '@/shared/components/CopyButton'
import { DateTimeField, formatDateTimeValue, parseDateTimeValue } from '@/shared/components/DateTimeField'
import { RollingText } from '@/shared/components/motion'
import { SectionCard, ValueCard, ValueGrid } from '@/shared/components/ValueCard'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'

import {
  BOUNDARIES,
  boundary,
  dateDetails,
  dateFormats,
  formatOffsetMinutes,
  isNumericInput,
  localTimeZone,
  parseDateText,
  parseTimestampValue,
  relativeDayLabel,
  type UnitChoice,
} from './dateModel'
import { Chip, EmptyHint, FieldLabel, InlineError, StatPill } from './parts'
import { useNow } from './useNow'

const MODES = ['toDate', 'toTimestamp', 'now'] as const
const UNITS: UnitChoice[] = ['auto', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds']
const UNIT_SHORT: Record<UnitChoice, string> = {
  auto: 'Auto',
  seconds: 's',
  milliseconds: 'ms',
  microseconds: 'µs',
  nanoseconds: 'ns',
}
const EXAMPLES = ['1743256800', '1743256800000', '2026-10-24T10:30:00Z', 'tomorrow', '+90d', '2 weeks ago']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function TimestampPanel({ initialInput = '' }: { initialInput?: string }) {
  const { t } = useTranslation()
  const [mode, setMode] = useDeepLinkParam('subtab', MODES, 'toDate')
  const [live, setLive] = useState(true)
  const now = useNow(live || mode === 'now')
  const [input, setInput] = useState(initialInput)
  const [unit, setUnit] = useState<UnitChoice>('auto')
  const [picked, setPicked] = useState(() => formatDateTimeValue(new Date()))

  const numeric = isNumericInput(input)
  const converted = useMemo(() => {
    if (!input.trim()) return null
    if (numeric) return parseTimestampValue(input, unit)
    const date = parseDateText(input)
    return date ? ({ ok: true, date, unit: null } as const) : ({ ok: false, error: 'notDate' } as const)
  }, [input, numeric, unit])

  const pickedDate = parseDateTimeValue(picked)
  const result: Date | null =
    mode === 'now' ? now : mode === 'toTimestamp' ? pickedDate : converted?.ok ? converted.date : null

  const zone = localTimeZone()
  const offset = formatOffsetMinutes(-now.getTimezoneOffset())
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const nowSeconds = String(Math.floor(now.getTime() / 1000))

  const paste = async () => {
    const text = await readClipboardText()
    if (text) {
      setInput(text.trim())
      setMode('toDate')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label={t('dtk.nowTitle')}
        className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-3.5 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ClockIcon className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3" aria-hidden />
                {zone}
              </span>
              <Badge variant="outline" className="h-5 px-1.5 font-mono text-[11px]">
                UTC{offset}
              </Badge>
            </div>
            <div className="mt-0.5 font-mono text-[28px] leading-9 font-semibold tracking-tight">
              <RollingText text={clock} />
            </div>
            <div className="text-[13px] text-muted-foreground">
              {now.toLocaleDateString(undefined, { dateStyle: 'full' })}
            </div>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setLive((value) => !value)}
            aria-label={live ? t('dtk.pause') : t('dtk.resume')}
            title={live ? t('dtk.pause') : t('dtk.resume')}
          >
            {live ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <NowChip label={t('dtk.unixSeconds')} value={nowSeconds} />
          <NowChip label={t('dtk.unixMillis')} value={String(now.getTime())} />
        </div>
      </section>

      <Segmented
        ariaLabel={t('dtk.modeLabel')}
        value={mode}
        onValueChange={setMode}
        className="w-full [&>button]:flex-1"
        options={[
          { value: 'toDate', label: <><HashIcon />{t('dtk.modeToDate')}</> },
          { value: 'toTimestamp', label: <><CalendarDaysIcon />{t('dtk.modeToTimestamp')}</> },
          { value: 'now', label: <><ClockIcon />{t('dtk.modeNow')}</> },
        ]}
      />

      {mode === 'toDate' && (
        <SectionCard bodyClassName="flex flex-col gap-2.5">
          <FieldLabel label={t('dtk.converterLabel')}>
            <div className="relative">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t('dtk.converterPlaceholder')}
                aria-label={t('dtk.converterLabel')}
                className="h-10 pr-16 font-mono text-[14px]"
              />
              <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                {input && (
                  <Button size="icon-xs" variant="ghost" onClick={() => setInput('')} aria-label={t('dtk.clear')}>
                    <XIcon />
                  </Button>
                )}
                <Button size="icon-xs" variant="ghost" onClick={() => void paste()} aria-label={t('dtk.paste')} title={t('dtk.paste')}>
                  <ClipboardPasteIcon />
                </Button>
              </div>
            </div>
          </FieldLabel>
          {numeric ? (
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                ariaLabel={t('dtk.unit')}
                value={unit}
                onValueChange={setUnit}
                options={UNITS.map((value) => ({
                  value,
                  label: UNIT_SHORT[value],
                  title: t(`dtk.unit.${value}`),
                }))}
              />
              {converted?.ok && converted.unit && (
                <span className="text-xs text-muted-foreground">
                  {t('dtk.readAs', { unit: t(`dtk.unit.${converted.unit}`) })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5" aria-label={t('dtk.examples')}>
              {EXAMPLES.map((example) => (
                <Chip key={example} onClick={() => setInput(example)}>
                  <span className="font-mono">{example}</span>
                </Chip>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {mode === 'toTimestamp' && (
        <SectionCard bodyClassName="flex flex-col gap-2.5">
          <FieldLabel label={t('dtk.pickDate')}>
            <DateTimeField value={picked} onChange={setPicked} ariaLabel={t('dtk.pickDate')} />
          </FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {BOUNDARIES.map((kind) => (
              <Chip
                key={kind}
                onClick={() => setPicked(formatDateTimeValue(boundary(pickedDate ?? new Date(), kind)))}
              >
                <ArrowDownToLineIcon />
                {t(`dtk.boundary.${kind}`)}
              </Chip>
            ))}
          </div>
        </SectionCard>
      )}

      {mode === 'toDate' && converted && !converted.ok && (
        <InlineError>{t(`dtk.error.${converted.error}`)}</InlineError>
      )}

      {result ? (
        <DateResult date={result} live={mode === 'now'} />
      ) : (
        mode === 'toDate' && !input.trim() && <EmptyHint icon={HistoryIcon}>{t('dtk.converterHint')}</EmptyHint>
      )}
    </div>
  )
}

function NowChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 py-1 pr-1 pl-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] leading-4 text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-[13px] tabular-nums">{value}</div>
      </div>
      <CopyButton text={value} label={label} />
    </div>
  )
}

export function DateResult({ date, live = false }: { date: Date; live?: boolean }) {
  const { t } = useTranslation()
  const formats = dateFormats(date)
  const details = dateDetails(date)
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-0.5">
        <h3 className="text-[13px] font-semibold">{t('dtk.results')}</h3>
        <span className="text-xs text-muted-foreground">
          {live ? t('dtk.liveNow') : relativeDayLabel(date)}
        </span>
      </div>
      <ValueGrid key={live ? 'live' : 'static'}>
        <ValueCard emphasis icon={CalendarDaysIcon} label={t('dtk.fmt.local')} value={formats.local} mono={false} />
        <ValueCard emphasis icon={HashIcon} label={t('dtk.fmt.unixSeconds')} value={formats.unixSeconds} />
        <ValueCard icon={HashIcon} label={t('dtk.fmt.unixMillis')} value={formats.unixMillis} />
        <ValueCard icon={GlobeIcon} label={t('dtk.fmt.iso')} value={formats.iso} />
        <ValueCard icon={MapPinIcon} label={t('dtk.fmt.isoLocal')} value={formats.isoLocal} />
        <ValueCard icon={GlobeIcon} label={t('dtk.fmt.utc')} value={formats.utc} />
        <ValueCard icon={ServerIcon} label={t('dtk.fmt.rfc')} value={formats.rfc} />
        <ValueCard icon={DatabaseIcon} label={t('dtk.fmt.sql')} value={formats.sql} />
      </ValueGrid>
      <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
        <StatPill label={t('dtk.detail.weekday')} value={details.weekday} />
        <StatPill
          label={t('dtk.detail.dayOfYear')}
          value={t('dtk.detail.dayOfYearValue', { day: details.dayOfYear, total: details.daysInYear })}
        />
        <StatPill
          label={t('dtk.detail.week')}
          value={t('dtk.detail.weekValue', { week: details.week, year: details.weekYear })}
        />
        <StatPill label={t('dtk.detail.quarter')} value={`Q${details.quarter}`} />
        <StatPill label={t('dtk.detail.daysInMonth')} value={details.daysInMonth} />
        <StatPill
          label={t('dtk.detail.leapYear')}
          value={details.leapYear ? t('dtk.yes') : t('dtk.no')}
        />
      </div>
    </div>
  )
}
