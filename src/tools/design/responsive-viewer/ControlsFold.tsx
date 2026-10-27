import { ChevronUpIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

/**
 * Folds the device rows under the address bar. Folded, it turns into a pill that still says how many
 * devices are shown and at what zoom, so nothing hidden is a surprise.
 */
export function ControlsFoldToggle({
  folded,
  controlsId,
  count,
  zoomLabel,
  onToggle,
}: {
  folded: boolean
  controlsId: string
  count: number
  zoomLabel: string
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const summary = t('rv.controls.summary', { count, zoom: zoomLabel })
  const hint = folded ? t('rv.controls.show') : t('rv.controls.fold')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={folded ? 'outline' : 'ghost'}
          size={folded ? 'xs' : 'icon-xs'}
          aria-expanded={!folded}
          aria-controls={controlsId}
          aria-label={folded ? `${t('rv.controls.label')}, ${summary}` : t('rv.controls.label')}
          onClick={onToggle}
          className={cn('shrink-0', folded && 'gap-1 rounded-full px-2 font-medium')}
        >
          {folded && (
            <>
              <SlidersHorizontalIcon aria-hidden className="text-muted-foreground" />
              <span className="hidden whitespace-nowrap tabular-nums @[480px]:inline">
                {summary}
              </span>
              <span className="tabular-nums @[480px]:hidden">{count}</span>
            </>
          )}
          <ChevronUpIcon
            aria-hidden
            className={cn(
              'transition-transform duration-200 motion-reduce:transition-none',
              folded && 'rotate-180 text-muted-foreground',
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}
