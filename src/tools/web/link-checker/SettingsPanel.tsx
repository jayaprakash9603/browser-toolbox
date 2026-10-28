import { useId, type ReactNode } from 'react'
import { RotateCcwIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  CHECK_SCOPES,
  CONCURRENCY_CHOICES,
  TIMEOUT_CHOICES,
  type CheckSettings,
} from '@/core/engines/linkChecker/report'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'

interface SettingsPanelProps {
  settings: CheckSettings
  onChange: (patch: Partial<CheckSettings>) => void
  onReset: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
}

export function SettingsPanel({ settings, onChange, onReset, open, onOpenChange, disabled }: SettingsPanelProps) {
  const { t } = useTranslation()
  const skipId = useId()

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('linkChecker.settings')}
          title={t('linkChecker.settings')}
          className="data-[state=open]:bg-accent"
        >
          <SlidersHorizontalIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="scrollbar-styled max-h-[min(34rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto p-0"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <SlidersHorizontalIcon className="size-4 text-primary" aria-hidden />
          <p className="flex-1 text-sm font-semibold">{t('linkChecker.settings')}</p>
          <Button variant="ghost" size="xs" className="h-6 px-1.5 text-[11px]" onClick={onReset} disabled={disabled}>
            <RotateCcwIcon />
            {t('linkChecker.resetSettings')}
          </Button>
        </div>
        <fieldset disabled={disabled} className="space-y-3.5 p-3 disabled:opacity-60">
          <Field label={t('linkChecker.scopeLabel')}>
            <Segmented
              value={settings.scope}
              onValueChange={(scope) => onChange({ scope })}
              ariaLabel={t('linkChecker.scopeLabel')}
              className="flex w-full [&>button]:flex-1"
              options={CHECK_SCOPES.map((scope) => ({ value: scope, label: t(`linkChecker.scope.${scope}`) }))}
            />
          </Field>
          <Field label={t('linkChecker.timeout')}>
            <ChoiceChips
              value={String(settings.timeoutMs)}
              onValueChange={(value) => onChange({ timeoutMs: Number(value) })}
              ariaLabel={t('linkChecker.timeout')}
              columns={4}
              options={TIMEOUT_CHOICES.map((ms) => ({ value: String(ms), label: t('linkChecker.timeoutValue', { seconds: ms / 1000 }) }))}
            />
          </Field>
          <Field label={t('linkChecker.concurrency')}>
            <ChoiceChips
              value={String(settings.concurrency)}
              onValueChange={(value) => onChange({ concurrency: Number(value) })}
              ariaLabel={t('linkChecker.concurrency')}
              columns={4}
              options={CONCURRENCY_CHOICES.map((count) => ({ value: String(count), label: String(count) }))}
            />
          </Field>
          <Field label={t('linkChecker.method')} hint={t(`linkChecker.methodHint.${settings.method}`)}>
            <ChoiceChips
              value={settings.method}
              onValueChange={(method) => onChange({ method })}
              ariaLabel={t('linkChecker.method')}
              columns={2}
              options={[
                { value: 'auto', label: t('linkChecker.method.auto') },
                { value: 'get', label: t('linkChecker.method.get') },
              ]}
            />
          </Field>
          <div className="space-y-1 rounded-lg border bg-muted/30 p-1">
            <ToggleRow
              label={t('linkChecker.includeFiles')}
              hint={t('linkChecker.includeFilesHint')}
              checked={settings.includeFiles}
              onChange={(includeFiles) => onChange({ includeFiles })}
            />
            <ToggleRow
              label={t('linkChecker.retryFailures')}
              hint={t('linkChecker.retryFailuresHint')}
              checked={settings.retryFailures}
              onChange={(retryFailures) => onChange({ retryFailures })}
            />
            <ToggleRow
              label={t('linkChecker.redirectsAsIssues')}
              hint={t('linkChecker.redirectsAsIssuesHint')}
              checked={settings.redirectsAsIssues}
              onChange={(redirectsAsIssues) => onChange({ redirectsAsIssues })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={skipId} className="text-xs font-medium">
              {t('linkChecker.skipList')}
            </label>
            <Textarea
              id={skipId}
              value={settings.skipText}
              onChange={(event) => onChange({ skipText: event.target.value })}
              placeholder={t('linkChecker.skipListPlaceholder')}
              rows={3}
              spellCheck={false}
              className="min-h-[68px] font-mono text-xs"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">{t('linkChecker.skipListHint')}</p>
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-background">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}
