import { useTranslation } from 'react-i18next'

import { NumberField } from '@/shared/components/NumberField'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'

import type { IntelligenceSettings } from './intelligenceSettings'

interface SettingsPanelProps {
  settings: IntelligenceSettings
  onChange: (patch: Partial<IntelligenceSettings>) => void
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 text-xs">
      <Field label={t('web.links.settings.depth')}>
        <NumberField
          value={String(settings.maxDepth)}
          onChange={(value) => onChange({ maxDepth: Number.parseInt(value, 10) || 1 })}
          min={0}
          max={20}
          ariaLabel={t('web.links.settings.depth')}
        />
      </Field>
      <Field label={t('web.links.settings.pages')}>
        <NumberField
          value={String(settings.maxPages)}
          onChange={(value) => onChange({ maxPages: Number.parseInt(value, 10) || 1 })}
          min={1}
          max={2000}
          ariaLabel={t('web.links.settings.pages')}
        />
      </Field>
      <Field label={t('web.links.settings.concurrency')}>
        <NumberField
          value={String(settings.concurrency)}
          onChange={(value) => onChange({ concurrency: Number.parseInt(value, 10) || 1 })}
          min={1}
          max={16}
          ariaLabel={t('web.links.settings.concurrency')}
        />
      </Field>
      <Field label={t('web.links.settings.exclude')}>
        <Input value={settings.excludeText} onChange={(event) => onChange({ excludeText: event.target.value })} />
      </Field>
      <Field label={t('web.links.settings.include')}>
        <Input value={settings.includeText} onChange={(event) => onChange({ includeText: event.target.value })} />
      </Field>
      <Field label={t('web.links.settings.timeout')}>
        <NumberField
          value={String(settings.timeoutMs)}
          onChange={(value) => onChange({ timeoutMs: Number.parseInt(value, 10) || settings.timeoutMs })}
          min={1000}
          max={60000}
          ariaLabel={t('web.links.settings.timeout')}
        />
      </Field>
      <Toggle label={t('web.links.settings.keepQuery')} checked={settings.keepQuery} onChange={(keepQuery) => onChange({ keepQuery })} />
      <Toggle label={t('web.links.settings.robots')} checked={settings.respectRobots} onChange={(respectRobots) => onChange({ respectRobots })} />
      <Toggle label={t('web.links.checkExternals')} checked={settings.checkExternals} onChange={(checkExternals) => onChange({ checkExternals })} />
      <Toggle label={t('web.links.settings.animate')} checked={settings.animate} onChange={(animate) => onChange({ animate })} />
      <Toggle label={t('web.links.settings.labels')} checked={settings.showLabels} onChange={(showLabels) => onChange({ showLabels })} />
      <p className="text-[11px] leading-relaxed text-muted-foreground">{t('web.links.settings.jsLimit')}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}
