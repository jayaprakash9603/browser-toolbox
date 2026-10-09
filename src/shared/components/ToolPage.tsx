import type { ReactNode } from 'react'
import { Link2Icon, MoreHorizontalIcon, SettingsIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ToolDefinition } from '@/core/registry'
import { Link } from '@/app/router'
import { removeRecentTool } from '@/features/recent-tools/recentToolsService'
import { BackButton } from '@/shared/components/BackButton'
import { FavoriteButton } from '@/shared/components/FavoriteButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { useToolLabels } from '@/shared/hooks/useToolLabels'
import { cn } from '@/shared/utils/cn'

interface ToolPageProps {
  tool: ToolDefinition
  children: ReactNode
  actions?: ReactNode
  backTo?: string
  contentClassName?: string
}

export function ToolPage({
  tool,
  children,
  actions,
  backTo = `/categories/${tool.category}`,
  contentClassName,
}: ToolPageProps) {
  const Icon = tool.icon
  const { t } = useTranslation()
  const { name, description } = useToolLabels(tool)

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${tool.route}`
    await navigator.clipboard.writeText(url)
  }

  const openNewTab = () => {
    const url = `${window.location.origin}${window.location.pathname}#${tool.route}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 bg-background/85 px-3 pt-3 pb-2.5 backdrop-blur-md @[360px]:px-4">
        <BackButton to={backTo} className="mt-0.5 shrink-0" />
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-sm">
          <Icon className="size-[18px] text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1>
          <p
            className="line-clamp-2 text-xs leading-relaxed text-muted-foreground"
            title={description}
          >
            {description}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <FavoriteButton toolId={tool.id} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('nav.moreOptions')}>
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void copyLink()}>
                <Link2Icon className="size-4" />
                {t('tool.copyLink')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openNewTab}>
                <Link2Icon className="size-4" />
                {t('tool.openNewTab')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void removeRecentTool(tool.id)}>
                <Trash2Icon className="size-4" />
                {t('tool.removeFromRecent')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <SettingsIcon className="size-4" />
                  {t('nav.settings')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <Separator />
      <div
        className={cn(
          'flex-1 overflow-y-auto overscroll-contain p-[var(--density-page-pad)]',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
