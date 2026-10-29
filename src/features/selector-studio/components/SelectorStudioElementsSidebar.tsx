import { ExternalLinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import { Button } from '@/shared/components/ui/button'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { StudioSettingsControls } from './StudioSettingsControls'

/** DevTools Elements sidebar: on/off + settings only (React DevTools–style). */
export function SelectorStudioElementsSidebar({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-muted/20 text-xs">
      <div className="border-b border-border/70 px-2.5 py-2">
        <p className="text-[11px] font-semibold leading-tight">{t('studio.hub.titlePane')}</p>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{t('studio.paneHint')}</p>
      </div>

      <div className="mx-2 mt-2 overflow-hidden rounded-md border border-border/70 bg-card shadow-sm">
        <StudioSettingsControls model={model} layout="inspector" />
      </div>

      {!model.settings.enabled && (
        <p role="status" className="mx-2.5 mt-2 text-[10px] leading-snug text-muted-foreground">
          {t('studio.panel.disabledBanner')}
        </p>
      )}

      <div className="mt-auto border-t border-border/60 p-2">
        <Button variant="outline" size="sm" className="h-8 w-full justify-start gap-2 text-[11px]" asChild>
          <Link to="/tools/qa/selector-studio">
            <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
            {t('studio.sidebar.openTool')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
