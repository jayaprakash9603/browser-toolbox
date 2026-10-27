import type { ComponentProps, ReactNode } from 'react'
import { ChevronDownIcon, ZoomInIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { ZOOM_MODES, type ZoomMode } from './devices'

export function IconAction({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** One compact button for the preview zoom instead of a five-way segmented strip. */
export function ZoomMenu({
  value,
  onChange,
}: {
  value: ZoomMode
  onChange: (zoom: ZoomMode) => void
}) {
  const { t } = useTranslation()
  const label = (zoom: ZoomMode) => (zoom === 'fit' ? t('rv.view.fit') : `${Number(zoom) * 100}%`)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 px-2 font-mono text-xs tabular-nums"
          aria-label={`${t('rv.view.zoom')}: ${label(value)}`}
          title={t('rv.view.zoom')}
        >
          <ZoomInIcon aria-hidden className="text-muted-foreground" />
          {label(value)}
          <ChevronDownIcon aria-hidden className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-32">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
          {t('rv.view.zoom')}
        </DropdownMenuLabel>
        {ZOOM_MODES.map((zoom) => (
          <DropdownMenuCheckboxItem
            key={zoom}
            checked={zoom === value}
            onCheckedChange={() => onChange(zoom)}
            className="font-mono text-xs tabular-nums"
          >
            {label(zoom)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
