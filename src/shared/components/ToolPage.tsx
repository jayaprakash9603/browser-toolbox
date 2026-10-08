import type { ReactNode } from 'react'

import type { ToolDefinition } from '@/core/registry'
import { BackButton } from '@/shared/components/BackButton'
import { FavoriteButton } from '@/shared/components/FavoriteButton'
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
  const { name, description } = useToolLabels(tool)
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 bg-background/85 px-4 pt-3 pb-2.5 backdrop-blur-md">
        <BackButton to={backTo} className="mt-0.5 shrink-0" />
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <Icon className="size-[18px] text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground" title={description}>
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <FavoriteButton toolId={tool.id} />
        </div>
      </header>
      <Separator />
      <div className={cn('flex-1 overflow-y-auto overscroll-contain p-4', contentClassName)}>{children}</div>
    </div>
  )
}
