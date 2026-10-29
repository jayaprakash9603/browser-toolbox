import {
  CrosshairIcon,
  HighlighterIcon,
  HistoryIcon,
  PencilIcon,
  RefreshCwIcon,
  SettingsIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'

export function HubSideRail({
  model,
  settingsOpen,
  onToggleSettings,
  onEdit,
  onOpenHistory,
  showHistory,
}: {
  model: SelectorStudioModel
  settingsOpen: boolean
  onToggleSettings: () => void
  onEdit: () => void
  onOpenHistory: () => void
  showHistory: boolean
}) {
  const { t } = useTranslation()

  const items = [
    {
      id: 'pick',
      label: model.picking ? t('studio.cancelPick') : t('studio.pick'),
      pressed: model.picking,
      active: model.picking,
      onClick: () => void model.pick(),
      icon: CrosshairIcon,
    },
    {
      id: 'refresh',
      label: t('studio.refresh'),
      onClick: () => void model.reanalyze(),
      icon: RefreshCwIcon,
      spin: model.analyzing,
    },
    {
      id: 'highlight',
      label: t('studio.highlight'),
      disabled: !model.active,
      onClick: () => model.active && void model.highlight(model.active),
      icon: HighlighterIcon,
    },
    {
      id: 'edit',
      label: t('studio.edit'),
      disabled: !model.active,
      onClick: onEdit,
      icon: PencilIcon,
    },
    ...(showHistory
      ? [
          {
            id: 'history',
            label: t('studio.tab.history'),
            onClick: onOpenHistory,
            icon: HistoryIcon,
          },
        ]
      : []),
    {
      id: 'settings',
      label: t('studio.settings'),
      pressed: settingsOpen,
      active: settingsOpen,
      onClick: onToggleSettings,
      icon: SettingsIcon,
    },
  ] as const

  return (
    <nav
      aria-label={t('studio.hub.sideActions')}
      className="flex w-9 shrink-0 flex-col items-center gap-0.5 border-r border-border/80 py-1"
    >
      {items.map((item) => (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <Button
              size="icon-xs"
              variant={'active' in item && item.active ? 'default' : 'ghost'}
              className="size-8"
              aria-label={item.label}
              aria-pressed={'pressed' in item ? item.pressed : undefined}
              disabled={'disabled' in item ? item.disabled : false}
              onClick={item.onClick}
            >
              <item.icon
                className={cn(
                  'size-3.5',
                  'spin' in item && item.spin && 'animate-spin motion-reduce:animate-none',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      ))}
    </nav>
  )
}
