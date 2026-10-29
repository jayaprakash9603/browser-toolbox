import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { SelectorStudioHubShell } from './SelectorStudioHubShell'
import { StudioSettingsControls } from './StudioSettingsControls'

export function SelectorStudioPanelView({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()

  return (
    <div className="@container flex h-full min-h-0">
      <aside
        className={cn(
          'flex w-[13rem] shrink-0 flex-col overflow-y-auto border-r border-border/80 bg-muted/10',
          '@[480px]:w-52',
        )}
        aria-label={t('studio.settings')}
      >
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('studio.settings')}
          </p>
        </div>
        <div className="flex flex-col gap-3 p-3">
          <StudioSettingsControls model={model} layout="stacked" />
        </div>
      </aside>
      <div className="min-h-0 min-w-0 flex-1">
        <SelectorStudioHubShell model={model} variant="panel" hideSettingsGear />
      </div>
    </div>
  )
}
