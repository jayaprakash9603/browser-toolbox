import { useTranslation } from 'react-i18next'

import { FRAMEWORK_LABELS, RANK_MODES, type FrameworkId } from '@/core/engines/selector-studio'

import { Button } from '@/shared/components/ui/button'

import type { SelectorStudioModel } from '../useSelectorStudio'

export function HubSettingsPanel({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      <p className="text-[12px] font-semibold">{t('studio.settings')}</p>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t('studio.rank')}</span>
        <select
          className="h-8 rounded-md border bg-background px-2"
          value={model.settings.rankMode}
          onChange={(event) => void model.setRankMode(event.target.value as (typeof RANK_MODES)[number])}
        >
          {RANK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`studio.rank.${mode}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t('studio.defaultFramework')}</span>
        <select
          className="h-8 rounded-md border bg-background px-2"
          value={model.settings.defaultFramework}
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
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={model.settings.autoHighlight}
          onChange={(event) => void model.patchSettings({ autoHighlight: event.target.checked })}
        />
        {t('studio.autoHighlight')}
      </label>
      <div className="space-y-1 border-t border-border/60 pt-2 text-muted-foreground">
        <p className="font-medium text-foreground">{t('studio.shortcuts')}</p>
        <p>{t('studio.shortcut.pick')}</p>
        <p>{t('studio.shortcut.copy')}</p>
        <p>{t('studio.shortcut.xpath')}</p>
        <p>{t('studio.shortcut.css')}</p>
      </div>
      <div className="flex flex-col gap-1 border-t border-border/60 pt-2">
        <Button size="xs" variant="outline" onClick={() => void model.clearHighlight()}>
          {t('studio.clearHighlight')}
        </Button>
        <Button size="xs" variant="ghost" onClick={() => void model.clearSelection()}>
          {t('studio.clear')}
        </Button>
        {model.client.kind === 'devtools' && (
          <Button size="xs" variant="ghost" onClick={model.inspect}>
            {t('studio.inspect')}
          </Button>
        )}
      </div>
    </div>
  )
}
