import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import {
  BriefcaseIcon,
  CopyIcon,
  EarthIcon,
  MoonIcon,
  PlusIcon,
  RotateCcwIcon,
  SunriseIcon,
  SunsetIcon,
  XIcon,
} from 'lucide-react'

import { isValidTimeZone } from '@/core/engines/timezone'
import { get, set } from '@/core/storage'
import { DateTimeField } from '@/shared/components/DateTimeField'
import { RollingText } from '@/shared/components/motion'
import { SearchInput } from '@/shared/components/SearchInput'
import { SectionCard } from '@/shared/components/ValueCard'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import {
  LOCAL_ZONE,
  allTimeZones,
  canonicalZone,
  dateToWallValue,
  dayPhase,
  formatDelta,
  formatOffsetMinutes,
  localTimeZone,
  offsetAt,
  sameZone,
  wallTimeToDate,
  zoneClock,
  zoneLabel,
  type DayPhase,
  type ZoneClock,
} from './dateModel'
import { useNow } from './useNow'

const ZONES_KEY = 'toolbox.datetime.zones'
const DEFAULT_ZONES = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]
const PHASE_ICON: Record<DayPhase, typeof SunriseIcon> = {
  morning: SunriseIcon,
  work: BriefcaseIcon,
  evening: SunsetIcon,
  night: MoonIcon,
}
const PHASE_TONE: Record<DayPhase, string> = {
  morning: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
  work: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  evening: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
  night: 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',
}

export function ZonesPanel() {
  const { t } = useTranslation()
  const [zones, setZones] = useState<string[]>(DEFAULT_ZONES)
  const [live, setLive] = useState(true)
  const now = useNow(live)
  const [reference, setReference] = useState(LOCAL_ZONE)
  const [wall, setWall] = useState(() => dateToWallValue(new Date(), LOCAL_ZONE))
  const [shiftHours, setShiftHours] = useState(0)

  useEffect(() => {
    let cancelled = false
    void get<string[]>(ZONES_KEY).then((stored) => {
      if (cancelled || !Array.isArray(stored)) return
      setZones(stored.filter((zone) => typeof zone === 'string' && isValidTimeZone(zone)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const saveZones = (next: string[]) => {
    setZones(next)
    void set(ZONES_KEY, next)
  }

  const base = live ? now : (wallTimeToDate(wall, reference) ?? now)
  const instantMs = base.getTime() + shiftHours * 3_600_000
  const local = localTimeZone()
  const referenceId = reference === LOCAL_ZONE ? local : reference

  const clocks = useMemo(() => {
    const instant = new Date(instantMs)
    const ids = [local, ...zones.filter((zone) => !sameZone(zone, local))]
    return ids
      .map((zone) => zoneClock(instant, zone, referenceId))
      .sort((x, y) => x.offset - y.offset || x.label.localeCompare(y.label))
  }, [instantMs, zones, local, referenceId])

  const changeReference = (next: string) => {
    if (!live) setWall(dateToWallValue(base, next))
    setReference(next === local ? LOCAL_ZONE : next)
  }

  const copyAll = () => {
    const lines = clocks.map(
      (clock) => `${clock.label} (${clock.zone}): ${clock.date} ${clock.time} UTC${formatOffsetMinutes(clock.offset)}`,
    )
    void navigator.clipboard.writeText(lines.join('\n'))
  }

  const shiftLabel =
    shiftHours === 0 ? t('dtk.shiftNone') : t('dtk.shiftBy', { value: formatDelta(shiftHours * 60) })

  return (
    <div className="flex flex-col gap-3">
      <SectionCard icon={EarthIcon} title={t('dtk.zonesTitle')} description={t('dtk.zonesHint')} bodyClassName="flex flex-col gap-3">
        <div className="@container">
          <div className="grid grid-cols-1 items-end gap-2 @md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t('dtk.zoneTime')}</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  {t('dtk.live')}
                  <Switch
                    checked={live}
                    onCheckedChange={(checked) => {
                      if (!checked) setWall(dateToWallValue(now, reference))
                      setLive(checked)
                    }}
                    aria-label={t('dtk.live')}
                  />
                </label>
              </div>
              <DateTimeField
                value={live ? dateToWallValue(now, reference) : wall}
                onChange={(value) => {
                  setLive(false)
                  setWall(value)
                }}
                ariaLabel={t('dtk.zoneTime')}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t('dtk.zoneIn')}</span>
              <Select value={referenceId} onValueChange={changeReference}>
                <SelectTrigger aria-label={t('dtk.zoneIn')} className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clocks.map((clock) => (
                    <SelectItem key={clock.zone} value={clock.zone}>
                      {clock.label}
                      {clock.zone === local ? ` · ${t('dtk.yourZone')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('dtk.shift')}</span>
            <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums">
              {shiftLabel}
              {shiftHours !== 0 && (
                <Button size="icon-xs" variant="ghost" onClick={() => setShiftHours(0)} aria-label={t('dtk.reset')}>
                  <RotateCcwIcon />
                </Button>
              )}
            </span>
          </div>
          <Slider
            min={-12}
            max={12}
            step={1}
            value={[shiftHours]}
            onValueChange={([value]) => setShiftHours(value)}
            thumbLabel={t('dtk.shift')}
            getValueText={() => shiftLabel}
          />
        </div>
      </SectionCard>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-[13px] font-semibold">
          {t('dtk.worldClock')}{' '}
          <span className="font-normal text-muted-foreground">({clocks.length})</span>
        </h3>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={copyAll} aria-label={t('dtk.copyAll')} title={t('dtk.copyAll')}>
            <CopyIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => saveZones(DEFAULT_ZONES)}
            aria-label={t('dtk.resetZones')}
            title={t('dtk.resetZones')}
          >
            <RotateCcwIcon />
          </Button>
          <AddZone existing={[local, ...zones]} onAdd={(zone) => saveZones([...zones, zone])} />
        </div>
      </div>

      <div className="@container">
        <ul className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-3">
          {clocks.map((clock, index) => (
            <ZoneCard
              key={clock.zone}
              clock={clock}
              index={index}
              isReference={clock.zone === referenceId}
              isLocal={clock.zone === local}
              onSelect={() => changeReference(clock.zone)}
              onRemove={() => saveZones(zones.filter((zone) => zone !== clock.zone))}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function ZoneCard({
  clock,
  index,
  isReference,
  isLocal,
  onSelect,
  onRemove,
}: {
  clock: ZoneClock
  index: number
  isReference: boolean
  isLocal: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const phase = dayPhase(clock.hour)
  const PhaseIcon = PHASE_ICON[phase]
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1], delay: reduce ? 0 : Math.min(index, 8) * 0.03 }}
      className={cn(
        'group relative flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-xs transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/40 hover:shadow-sm',
        isReference && 'border-primary/50 bg-primary/[0.05] ring-1 ring-primary/20',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isReference}
        aria-label={t('dtk.useAsReference', { zone: clock.label })}
        className="absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="pointer-events-none relative flex items-start gap-2">
        <span
          className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', PHASE_TONE[phase])}
          title={t(`dtk.phase.${phase}`)}
        >
          <PhaseIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{clock.label}</span>
            {isLocal && (
              <Badge variant="secondary" className="h-[18px] px-1.5 text-[11px]">
                {t('dtk.you')}
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">{clock.zone}</div>
        </div>
      </div>
      {!isLocal && (
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onRemove}
          aria-label={t('dtk.removeZone', { zone: clock.label })}
          className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-[640px]:opacity-100 data-[ref=true]:hidden"
          data-ref={isReference}
        >
          <XIcon />
        </Button>
      )}
      <div className="pointer-events-none relative flex items-end justify-between gap-2">
        <span className="font-mono text-[26px] leading-8 font-semibold tracking-tight">
          <RollingText text={clock.time} />
        </span>
        {isReference ? (
          <Badge className="mb-1 h-5 px-1.5 text-[11px]">{t('dtk.reference')}</Badge>
        ) : (
          <span className="pb-1 font-mono text-xs text-muted-foreground tabular-nums">
            {clock.delta === 0 ? t('dtk.sameTime') : formatDelta(clock.delta)}
          </span>
        )}
      </div>
      <div className="pointer-events-none relative flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{clock.date}</span>
        {clock.dayDelta !== 0 && (
          <span className="rounded bg-muted px-1.5 py-px font-medium text-foreground">
            {clock.dayDelta > 0 ? t('dtk.tomorrow') : t('dtk.yesterday')}
          </span>
        )}
        <span className="ml-auto font-mono">UTC{formatOffsetMinutes(clock.offset)}</span>
      </div>
      <span className="sr-only">{t(`dtk.phase.${phase}`)}</span>
    </motion.li>
  )
}

function AddZone({ existing, onAdd }: { existing: string[]; onAdd: (zone: string) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const all = useMemo(
    () => allTimeZones().map((zone) => ({ zone, canonical: canonicalZone(zone) })),
    [],
  )
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase().replaceAll(' ', '_')
    const taken = new Set(existing.map(canonicalZone))
    const now = new Date()
    return all
      .filter((entry) => !taken.has(entry.canonical))
      .map((entry) => entry.zone)
      .filter(
        (zone) =>
          !needle ||
          zone.toLowerCase().includes(needle) ||
          zoneLabel(zone).toLowerCase().includes(query.trim().toLowerCase()),
      )
      .slice(0, 80)
      .map((zone) => ({ zone, label: zoneLabel(zone), offset: offsetAt(now, zone) }))
  }, [all, existing, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon /> {t('dtk.addZone')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('dtk.searchZones')} ariaLabel={t('dtk.searchZones')} />
        <ul className="scrollbar-styled mt-2 max-h-64 overflow-y-auto" aria-label={t('dtk.addZone')}>
          {matches.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">{t('dtk.noZones')}</li>
          )}
          {matches.map((match) => (
            <li key={match.zone}>
              <button
                type="button"
                onClick={() => {
                  onAdd(match.zone)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{match.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{match.zone}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatOffsetMinutes(match.offset)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
