import { useId } from 'react'
import { GaugeIcon, RotateCcwIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { Separator } from '@/shared/components/ui/separator'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import { PITCH_RANGE, RATE_RANGE, type ReadAloudPrefs, type ReaderTextSize } from './prefs'
import { WORDS_PER_MINUTE } from './speechText'

const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 2] as const

function formatRate(rate: number): string {
  return `${Number(rate.toFixed(2))}×`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

interface SpeedPopoverProps {
  rate: number
  disabled?: boolean
  onChange: (rate: number) => void
}

export function SpeedPopover({ rate, disabled, onChange }: SpeedPopoverProps) {
  const { t } = useTranslation()
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              aria-label={t('text.readAloud.speedValue', { value: Number(rate.toFixed(2)) })}
              className="min-w-14 font-semibold tabular-nums"
            >
              <GaugeIcon aria-hidden />
              {formatRate(rate)}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('text.readAloud.speed')}</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" className="w-64">
        <div className="flex items-baseline justify-between">
          <Label className="text-xs">{t('text.readAloud.speed')}</Label>
          <span className="text-lg font-semibold tabular-nums">{formatRate(rate)}</span>
        </div>
        <Slider
          className="mt-3"
          min={RATE_RANGE.min}
          max={RATE_RANGE.max}
          step={RATE_RANGE.step}
          value={[rate]}
          onValueChange={([value]) => onChange(round(value))}
          thumbLabel={t('text.readAloud.speed')}
          getValueText={(value) => formatRate(value)}
        />
        <div role="group" aria-label={t('text.readAloud.speedPresets')} className="mt-3 grid grid-cols-5 gap-1">
          {SPEED_PRESETS.map((preset) => {
            const active = Math.abs(rate - preset) < 0.001
            return (
              <Button
                key={preset}
                type="button"
                size="xs"
                variant={active ? 'default' : 'outline'}
                aria-pressed={active}
                className="px-0 tabular-nums"
                onClick={() => onChange(preset)}
              >
                {formatRate(preset)}
              </Button>
            )
          })}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          {t('text.readAloud.speedWpm', { wpm: Math.round(WORDS_PER_MINUTE * rate) })}
        </p>
      </PopoverContent>
    </Popover>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px]">
          {label}
        </Label>
        <p id={`${id}-hint`} className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch id={id} aria-describedby={`${id}-hint`} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  )
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <Label className="text-[13px]">{label}</Label>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(round(next))}
        thumbLabel={label}
        getValueText={() => display}
      />
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

interface ReadingOptionsProps {
  prefs: ReadAloudPrefs
  onChange: (patch: Partial<ReadAloudPrefs>) => void
  onReset: () => void
}

export function ReadingOptionsPopover({ prefs, onChange, onReset }: ReadingOptionsProps) {
  const { t } = useTranslation()
  const sizeOptions = [
    { value: 'sm', label: <span className="text-[11px]">A</span>, title: t('text.readAloud.textSizeSm') },
    { value: 'md', label: <span className="text-[13px]">A</span>, title: t('text.readAloud.textSizeMd') },
    { value: 'lg', label: <span className="text-base">A</span>, title: t('text.readAloud.textSizeLg') },
  ] as const

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t('text.readAloud.options')}>
              <SlidersHorizontalIcon aria-hidden />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('text.readAloud.options')}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        className="scrollbar-styled flex max-h-[min(30rem,var(--radix-popover-content-available-height))] w-[min(18.5rem,calc(100vw-1.5rem))] flex-col gap-3.5 overflow-y-auto"
      >
        <p className="text-sm font-semibold">{t('text.readAloud.options')}</p>
        <SliderRow
          label={t('text.readAloud.pitch')}
          value={prefs.pitch}
          display={prefs.pitch.toFixed(2)}
          min={PITCH_RANGE.min}
          max={PITCH_RANGE.max}
          step={PITCH_RANGE.step}
          onChange={(pitch) => onChange({ pitch })}
        />
        <SliderRow
          label={t('text.readAloud.volume')}
          value={prefs.volume}
          display={`${Math.round(prefs.volume * 100)}%`}
          min={0}
          max={1}
          step={0.05}
          onChange={(volume) => onChange({ volume })}
        />
        <div className="flex items-center justify-between gap-3">
          <Label className="text-[13px]">{t('text.readAloud.textSize')}</Label>
          <Segmented<ReaderTextSize>
            size="sm"
            ariaLabel={t('text.readAloud.textSize')}
            value={prefs.textSize}
            options={sizeOptions}
            onValueChange={(textSize) => onChange({ textSize })}
          />
        </div>
        <Separator />
        <SwitchRow
          label={t('text.readAloud.follow')}
          hint={t('text.readAloud.followHint')}
          checked={prefs.follow}
          onChange={(follow) => onChange({ follow })}
        />
        <SwitchRow
          label={t('text.readAloud.highlightWords')}
          hint={t('text.readAloud.highlightWordsHint')}
          checked={prefs.highlightWords}
          onChange={(highlightWords) => onChange({ highlightWords })}
        />
        <SwitchRow
          label={t('text.readAloud.skipUrls')}
          hint={t('text.readAloud.skipUrlsHint')}
          checked={prefs.skipUrls}
          onChange={(skipUrls) => onChange({ skipUrls })}
        />
        <SwitchRow
          label={t('text.readAloud.skipCitations')}
          hint={t('text.readAloud.skipCitationsHint')}
          checked={prefs.skipCitations}
          onChange={(skipCitations) => onChange({ skipCitations })}
        />
        <SwitchRow
          label={t('text.readAloud.readCode')}
          hint={t('text.readAloud.readCodeHint')}
          checked={prefs.readCode}
          onChange={(readCode) => onChange({ readCode })}
        />
        <Separator />
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t('text.readAloud.shortcuts')}</p>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
            <dt>
              <Kbd>Space</Kbd>
            </dt>
            <dd>{t('text.readAloud.shortcutPlay')}</dd>
            <dt className="flex gap-1">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
            </dt>
            <dd>{t('text.readAloud.shortcutSkip')}</dd>
            <dt>
              <Kbd>Esc</Kbd>
            </dt>
            <dd>{t('text.readAloud.shortcutStop')}</dd>
          </dl>
        </div>
        <Button type="button" variant="ghost" size="xs" className="self-start" onClick={onReset}>
          <RotateCcwIcon aria-hidden />
          {t('text.readAloud.resetDefaults')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
