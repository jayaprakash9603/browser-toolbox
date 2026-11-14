import {
  CrosshairIcon,
  FileCode2Icon,
  HighlighterIcon,
  HistoryIcon,
  PencilIcon,
  RefreshCwIcon,
  SettingsIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'

export function HubSideRail({
  model,
  settingsOpen,
  onToggleSettings,
  onEdit,
  onOpenHistory,
  onOpenCode,
  showHistory,
  disabled = false,
  hideSettings = false,
  align = 'right',
}: {
  model: SelectorStudioModel
  settingsOpen: boolean
  onToggleSettings: () => void
  onEdit: () => void
  onOpenHistory: () => void
  onOpenCode?: () => void
  showHistory: boolean
  disabled?: boolean
  hideSettings?: boolean
  align?: 'left' | 'right'
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
      disabled,
    },
    {
      id: 'refresh',
      label: t('studio.refresh'),
      onClick: () => void model.reanalyze(),
      icon: RefreshCwIcon,
      spin: model.analyzing,
      disabled,
    },
    {
      id: 'highlight',
      label: t('studio.highlight'),
      disabled: disabled || !model.active,
      onClick: () => model.active && void model.highlight(model.active),
      icon: HighlighterIcon,
    },
    {
      id: 'edit',
      label: t('studio.edit'),
      disabled: disabled || !model.active,
      onClick: onEdit,
      icon: PencilIcon,
    },
    ...(onOpenCode
      ? [
          {
            id: 'code',
            label: t('studio.tab.code'),
            onClick: onOpenCode,
            icon: FileCode2Icon,
          },
        ]
      : []),
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
    ...(hideSettings
      ? []
      : [
          {
            id: 'settings',
            label: t('studio.settings'),
            pressed: settingsOpen,
            active: settingsOpen,
            onClick: onToggleSettings,
            icon: SettingsIcon,
          },
        ]),
  ] as const

  const hub = align === 'right'

  return (
    <nav
      aria-label={t('studio.hub.sideActions')}
      className={cn(
        'flex shrink-0 flex-col items-center py-2',
        hub ? 'w-[34px] gap-3.5 border-l border-[#e5e7eb] bg-[#f9fafb]' : 'w-10 gap-1 border-r border-border/80',
      )}
    >
      {items.map((item) => (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center justify-center rounded transition active:scale-95',
                hub ? 'size-6' : 'size-8 border border-transparent hover:bg-muted',
                hub
                  ? 'active' in item && item.active
                    ? 'text-[var(--sh-orange,#ff7700)]'
                    : 'text-[#6b7280] hover:text-[var(--sh-orange,#ff7700)]'
                  : 'active' in item && item.active
                    ? 'bg-primary text-primary-foreground'
                    : '',
              )}
              aria-label={item.label}
              aria-pressed={'pressed' in item ? item.pressed : undefined}
              disabled={'disabled' in item ? item.disabled : false}
              onClick={item.onClick}
            >
              <item.icon
                className={cn(
                  hub ? 'size-3' : 'size-3.5',
                  'spin' in item && item.spin && 'animate-spin motion-reduce:animate-none',
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side={hub ? 'left' : 'right'}>{item.label}</TooltipContent>
        </Tooltip>
      ))}
    </nav>
  )
}