import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { FRAMEWORK_LABELS, RANK_MODES, type FrameworkId } from '@/core/engines/selector-studio'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'

function InspectorRow({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: string
  description?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-border/60 px-2.5 py-2 last:border-b-0',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <Label htmlFor={htmlFor} className="text-[11px] font-medium leading-snug">
          {label}
        </Label>
        {description && (
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  )
}

/** Shared enable / sync / rank controls (Elements sidebar + optional panels). */
export function StudioSettingsControls({
  model,
  layout = 'inspector',
}: {
  model: SelectorStudioModel
  layout?: 'inspector' | 'stacked'
}) {
  const { t } = useTranslation()
  const { settings } = model
  const stacked = layout === 'stacked'

  const toggleRow = (
    id: string,
    label: string,
    description: string | undefined,
    checked: boolean,
    onCheckedChange: (value: boolean) => void,
    disabled?: boolean,
  ) => {
    if (stacked) {
      return (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor={id} className="text-xs font-medium leading-snug">
              {label}
            </Label>
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
          <Switch
            id={id}
            checked={checked}
            disabled={disabled}
            onCheckedChange={onCheckedChange}
            aria-label={label}
          />
        </div>
      )
    }
    return (
      <InspectorRow label={label} description={description} htmlFor={id}>
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={label}
        />
      </InspectorRow>
    )
  }

  const selectBlock = (label: string, select: ReactNode) => {
    if (stacked) {
      return (
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          {select}
        </label>
      )
    }
    return (
      <div className="border-b border-border/60 px-2.5 py-2 last:border-b-0">
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        <div className="mt-1.5">{select}</div>
      </div>
    )
  }

  return (
    <>
      {toggleRow(
        'studio-enabled',
        t('studio.panel.enabled'),
        t('studio.panel.enabledHelp'),
        settings.enabled,
        (checked) => void model.patchSettings({ enabled: checked }),
      )}
      {toggleRow(
        'studio-live-sync',
        t('studio.panel.liveSync'),
        t('studio.panel.liveSyncHelp'),
        settings.livePageSync,
        (checked) => void model.patchSettings({ livePageSync: checked }),
        !settings.enabled,
      )}
      {toggleRow(
        'studio-auto-highlight',
        t('studio.autoHighlight'),
        undefined,
        settings.autoHighlight,
        (checked) => void model.patchSettings({ autoHighlight: checked }),
        !settings.enabled,
      )}
      {selectBlock(
        t('studio.rank'),
        <select
          className="h-8 w-full rounded-md border bg-background px-2 text-[11px]"
          value={settings.rankMode}
          disabled={!settings.enabled}
          onChange={(event) => void model.setRankMode(event.target.value as (typeof RANK_MODES)[number])}
        >
          {RANK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`studio.rank.${mode}`)}
            </option>
          ))}
        </select>,
      )}
      {selectBlock(
        t('studio.defaultFramework'),
        <select
          className="h-8 w-full rounded-md border bg-background px-2 text-[11px]"
          value={settings.defaultFramework}
          disabled={!settings.enabled}
          onChange={(event) =>
            void model.patchSettings({ defaultFramework: event.target.value as FrameworkId })
          }
        >
          {Object.entries(FRAMEWORK_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>,
      )}
    </>
  )
}
