import { useId, type ReactNode } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { InlineGranularity, WhitespaceRule } from '@/core/engines/diff'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { Separator } from '@/shared/components/ui/separator'
import { Switch } from '@/shared/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import { DEFAULT_PREFS, type DiffPrefs } from './prefs'

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] leading-5">{label}</span>
        {hint && <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] leading-5">{label}</span>
      {children}
    </div>
  )
}

export function RulesPopover({ prefs, onChange }: { prefs: DiffPrefs; onChange: (patch: Partial<DiffPrefs>) => void }) {
  const { t } = useTranslation()
  const setRule = (patch: Partial<DiffPrefs['rules']>) => onChange({ rules: { ...prefs.rules, ...patch } })
  const defaults = {
    rules: DEFAULT_PREFS.rules,
    ignoreMinor: DEFAULT_PREFS.ignoreMinor,
    granularity: DEFAULT_PREFS.granularity,
    contextLines: DEFAULT_PREFS.contextLines,
    showWhitespace: DEFAULT_PREFS.showWhitespace,
  }
  const customized =
    (Object.keys(defaults.rules) as (keyof DiffPrefs['rules'])[]).some((key) => prefs.rules[key] !== defaults.rules[key]) ||
    prefs.ignoreMinor !== defaults.ignoreMinor ||
    prefs.granularity !== defaults.granularity ||
    prefs.contextLines !== defaults.contextLines ||
    prefs.showWhitespace !== defaults.showWhitespace

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('diff.rules')}
              className="relative text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
            >
              <SlidersHorizontalIcon />
              {customized && <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('diff.rules')}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-3">
        <div>
          <p className="text-sm font-semibold">{t('diff.rulesTitle')}</p>
          <p className="text-[11px] leading-4 text-muted-foreground">{t('diff.rulesHint')}</p>
        </div>
        <Field label={t('diff.ruleWhitespace')}>
          <Segmented<WhitespaceRule>
            size="sm"
            ariaLabel={t('diff.ruleWhitespace')}
            value={prefs.rules.whitespace}
            onValueChange={(whitespace) => setRule({ whitespace })}
            options={[
              { value: 'exact', label: t('diff.wsExact') },
              { value: 'trim', label: t('diff.wsTrim') },
              { value: 'all', label: t('diff.wsAll') },
            ]}
          />
        </Field>
        <SwitchRow label={t('diff.ruleCase')} checked={prefs.rules.ignoreCase} onChange={(ignoreCase) => setRule({ ignoreCase })} />
        <SwitchRow
          label={t('diff.ruleBlank')}
          checked={prefs.rules.ignoreBlankLines}
          onChange={(ignoreBlankLines) => setRule({ ignoreBlankLines })}
        />
        <SwitchRow
          label={t('diff.ignoreMinor')}
          hint={t('diff.ignoreMinorHint')}
          checked={prefs.ignoreMinor}
          onChange={(ignoreMinor) => onChange({ ignoreMinor })}
        />
        <Separator />
        <Field label={t('diff.granularity')}>
          <Segmented<InlineGranularity>
            size="sm"
            ariaLabel={t('diff.granularity')}
            value={prefs.granularity}
            onValueChange={(granularity) => onChange({ granularity })}
            options={[
              { value: 'words', label: t('diff.granularityWords') },
              { value: 'chars', label: t('diff.granularityChars') },
            ]}
          />
        </Field>
        <Field label={t('diff.contextLines')}>
          <Segmented<string>
            size="sm"
            ariaLabel={t('diff.contextLines')}
            value={String(prefs.contextLines)}
            onValueChange={(value) => onChange({ contextLines: Number(value) })}
            options={['1', '3', '5', '10'].map((value) => ({ value, label: value }))}
          />
        </Field>
        <SwitchRow
          label={t('diff.showWhitespace')}
          checked={prefs.showWhitespace}
          onChange={(showWhitespace) => onChange({ showWhitespace })}
        />
        <Button
          variant="ghost"
          size="xs"
          className="self-start"
          disabled={!customized}
          onClick={() => onChange(defaults)}
        >
          {t('diff.resetRules')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
