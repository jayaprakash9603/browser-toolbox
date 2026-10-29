import { LayersIcon } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

const loadBody = () => import('./TechStackPopoverBody')
const PopoverBody = lazy(loadBody)

/** Header icon that opens the technologies detected on the page the user is looking at. */
export function TechStackButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const preload = () => void loadBody()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('nav.techStack')}
              onPointerEnter={preload}
              onFocus={preload}
            >
              <LayersIcon className="size-[18px]" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('nav.techStack')}</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="flex max-h-[min(36rem,calc(100dvh-4.5rem))] w-[min(32rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl p-0"
      >
        <Suspense fallback={<div className="h-56" />}>
          <PopoverBody />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}
