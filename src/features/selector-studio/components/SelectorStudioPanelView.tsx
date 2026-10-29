import { CrosshairIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { StudioSettingsControls } from './StudioSettingsControls'

/** Extension side panel: settings only (React DevTools style). Selectors live in DevTools Elements sidebar. */
export function SelectorStudioPanelView({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-muted/15">
      <div className="border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-sm">
        <p className="text-sm font-semibold tracking-tight">{t('studio.settings')}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('studio.sidePanel.intro')}</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <CrosshairIcon className="size-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold">{t('studio.sidePanel.sectionGeneral')}</span>
          </header>
          <StudioSettingsControls model={model} layout="inspector" />
        </section>

        <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex flex-col gap-1 p-2">
            <Button
              size="sm"
              variant="outline"
              className="justify-start"
              disabled={!model.settings.enabled}
              onClick={() => void model.clearHighlight()}
            >
              {t('studio.clearHighlight')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="justify-start"
              disabled={!model.settings.enabled}
              onClick={() => void model.clearSelection()}
            >
              {t('studio.clear')}
            </Button>
          </div>
        </section>

        <p className="text-[11px] leading-relaxed text-muted-foreground">{t('studio.sidePanel.devtoolsHint')}</p>
      </div>
    </div>
  )
}
