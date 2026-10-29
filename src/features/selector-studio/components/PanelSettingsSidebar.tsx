import { useTranslation } from 'react-i18next'

import { FRAMEWORK_LABELS, RANK_MODES, type FrameworkId } from '@/core/engines/selector-studio'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'

export function PanelSettingsSidebar({
  model,
  className,
}: {
  model: SelectorStudioModel
  className?: string
}) {
  const { t } = useTranslation()
  const { settings } = model

  return (
    <div className={cn('flex flex-col gap-3 text-xs', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('studio.settings')}
      </p>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor="studio-enabled" className="text-xs font-medium leading-snug">
            {t('studio.panel.enabled')}
          </Label>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {t('studio.panel.enabledHelp')}
          </p>
        </div>
        <Switch
          id="studio-enabled"
          checked={settings.enabled}
          onCheckedChange={(checked) => void model.patchSettings({ enabled: checked })}
          aria-label={t('studio.panel.enabled')}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor="studio-live-sync" className="text-xs font-medium leading-snug">
            {t('studio.panel.liveSync')}
          </Label>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {t('studio.panel.liveSyncHelp')}
          </p>
        </div>
        <Switch
          id="studio-live-sync"
          checked={settings.livePageSync}
          disabled={!settings.enabled}
          onCheckedChange={(checked) => void model.patchSettings({ livePageSync: checked })}
          aria-label={t('studio.panel.liveSync')}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="studio-auto-highlight" className="text-xs font-medium">
          {t('studio.autoHighlight')}
        </Label>
        <Switch
          id="studio-auto-highlight"
          checked={settings.autoHighlight}
          disabled={!settings.enabled}
          onCheckedChange={(checked) => void model.patchSettings({ autoHighlight: checked })}
          aria-label={t('studio.autoHighlight')}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">{t('studio.rank')}</span>
        <select
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={settings.rankMode}
          disabled={!settings.enabled}
          onChange={(event) => void model.setRankMode(event.target.value as (typeof RANK_MODES)[number])}
        >
          {RANK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`studio.rank.${mode}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">{t('studio.defaultFramework')}</span>
        <select
          className="h-9 rounded-md border bg-background px-2 text-xs"
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
        </select>
      </label>

      <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
        <Button
          size="sm"
          variant="outline"
          className="justify-start"
          disabled={!settings.enabled}
          onClick={() => void model.clearHighlight()}
        >
          {t('studio.clearHighlight')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          disabled={!settings.enabled}
          onClick={() => void model.clearSelection()}
        >
          {t('studio.clear')}
        </Button>
      </div>
    </div>
  )
}
