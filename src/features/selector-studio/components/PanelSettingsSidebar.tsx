import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { StudioSettingsControls } from './StudioSettingsControls'

/** Stacked settings block (legacy panel sidebar layout). */
export function PanelSettingsSidebar({
  model,
  className,
}: {
  model: SelectorStudioModel
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-3 text-xs', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('studio.settings')}
      </p>
      <StudioSettingsControls model={model} layout="stacked" />
    </div>
  )
}
