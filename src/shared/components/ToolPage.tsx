import { useEffect, useState, type ReactNode } from 'react'
import {
  CheckIcon,
  ExternalLinkIcon,
  InfoIcon,
  Link2Icon,
  MoreHorizontalIcon,
  SettingsIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ToolDefinition } from '@/core/registry'
import { getUserCategoryIdForTool } from '@/core/registry/userCategories'
import { Link, useRouter } from '@/app/router'
import { removeRecentTool } from '@/features/recent-tools/recentToolsService'
import { useWorkspaceId } from '@/features/workspace/WorkspaceContext'
import { BackButton } from '@/shared/components/BackButton'
import { FavoriteButton } from '@/shared/components/FavoriteButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
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
  backTo = `/categories/${getUserCategoryIdForTool(tool)}`,
  contentClassName,
}: ToolPageProps) {
  const Icon = tool.icon
  const { t } = useTranslation()
  const { name, description } = useToolLabels(tool)
  const workspaceId = useWorkspaceId()
  const inWorkspace = workspaceId !== null
  const isWorkspaceHostView = workspaceId === tool.id
  const { path, search } = useRouter()
  const deepLink = path === tool.route ? `${tool.route}${search}` : tool.route

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${deepLink}`
    await navigator.clipboard.writeText(url)
  }

  const openNewTab = () => {
    const url = `${window.location.origin}${window.location.pathname}#${deepLink}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2.5 bg-background/85 px-3 py-2 backdrop-blur-md @[360px]:px-4">
        {!inWorkspace && <BackButton to={backTo} className="shrink-0" />}
        {!inWorkspace && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 shadow-sm">
            <Icon className="size-4 text-primary" aria-hidden />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-0.5">
          {isWorkspaceHostView ? null : inWorkspace ? (
            <h2 className="truncate text-sm font-semibold tracking-tight">{name}</h2>
          ) : (
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1>
          )}
          {!isWorkspaceHostView && (
            <ToolInfo
              name={name}
              description={description}
              category={t(`categories.${tool.category}.name`, { defaultValue: tool.category })}
              icon={<Icon className="size-4 text-primary" aria-hidden />}
              onCopyLink={copyLink}
              onOpenNewTab={openNewTab}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
          'relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-[var(--density-page-pad)]',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}

function ToolInfo({
  name,
  description,
  category,
  icon,
  onCopyLink,
  onOpenNewTab,
}: {
  name: string
  description: string
  category: string
  icon: ReactNode
  onCopyLink: () => Promise<void>
  onOpenNewTab: () => void
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
          aria-label={t('tool.about', { name })}
          title={t('tool.about', { name })}
        >
          <InfoIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-start gap-3 p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5">{name}</p>
            <Badge variant="secondary" className="mt-1">
              {category}
            </Badge>
          </div>
        </div>
        <p className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <Separator />
        <div className="flex flex-col p-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => void onCopyLink().then(() => setCopied(true))}
          >
            {copied ? <CheckIcon className="text-primary" /> : <Link2Icon />}
            {copied ? t('tool.linkCopied') : t('tool.copyLink')}
          </Button>
          <Button variant="ghost" size="sm" className="justify-start" onClick={onOpenNewTab}>
            <ExternalLinkIcon />
            {t('tool.openNewTab')}
          </Button>
        </div>
        <span role="status" className="sr-only">
          {copied ? t('tool.linkCopied') : ''}
        </span>
      </PopoverContent>
    </Popover>
  )
}
