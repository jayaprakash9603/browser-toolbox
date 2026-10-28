import { RotateCcwIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { OptionSwitch } from '@/shared/components/toolkit'

import { MAX_NODE_CHOICES, type A11yToolkitPrefs } from './prefs'

interface SettingsPanelProps {
  prefs: A11yToolkitPrefs
  onChange: (patch: Partial<A11yToolkitPrefs>) => void
  onReset: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
}

export function SettingsPanel({ prefs, onChange, onReset, open, onOpenChange, disabled }: SettingsPanelProps) {
  const { t } = useTranslation()

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('a11y.settings')}
          title={t('a11y.settings')}
          className="data-[state=open]:bg-accent"
          disabled={disabled}
        >
          <SlidersHorizontalIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
          <p className="flex-1 text-sm font-semibold">{t('a11y.settings')}</p>
          <Button variant="ghost" size="xs" className="h-6 px-1.5 text-[11px]" onClick={onReset} disabled={disabled}>
            <RotateCcwIcon />
            {t('a11y.resetSettings')}
          </Button>
        </div>
        <fieldset disabled={disabled} className="space-y-2 p-3 disabled:opacity-60">
          <OptionSwitch
            label={t('a11y.includeAAA')}
            hint={t('a11y.includeAAAHint')}
            checked={prefs.includeAAA}
            onChange={(includeAAA) => onChange({ includeAAA })}
          />
          <OptionSwitch
            label={t('a11y.includeNotices')}
            hint={t('a11y.includeNoticesHint')}
            checked={prefs.includeNotices}
            onChange={(includeNotices) => onChange({ includeNotices })}
          />
          <OptionSwitch
            label={t('a11y.contrastScan')}
            hint={t('a11y.contrastScanHint')}
            checked={prefs.contrast}
            onChange={(contrast) => onChange({ contrast })}
          />
          <OptionSwitch
            label={t('a11y.autoRescan')}
            hint={t('a11y.autoRescanHint')}
            checked={prefs.autoRescan}
            onChange={(autoRescan) => onChange({ autoRescan })}
          />
          <div className="space-y-1 rounded-lg border bg-muted/30 p-2">
            <p className="text-[11px] font-medium text-muted-foreground">{t('a11y.maxNodes')}</p>
            <p className="text-[11px] text-muted-foreground">{t('a11y.maxNodesHint')}</p>
            <ChoiceChips
              value={String(prefs.maxNodes)}
              onValueChange={(value) => onChange({ maxNodes: Number(value) })}
              ariaLabel={t('a11y.maxNodes')}
              columns={4}
              options={MAX_NODE_CHOICES.map((count) => ({ value: String(count), label: String(count) }))}
            />
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  )
}
