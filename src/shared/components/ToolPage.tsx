import type { ReactNode } from 'react'

import type { ToolDefinition } from '@/core/registry'
import { BackButton } from '@/shared/components/BackButton'
import { FavoriteButton } from '@/shared/components/FavoriteButton'
import { Separator } from '@/shared/components/ui/separator'

interface ToolPageProps {
  tool: ToolDefinition
  children: ReactNode
  actions?: ReactNode
}

export function ToolPage({ tool, children, actions }: ToolPageProps) {
  const Icon = tool.icon
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-2.5 px-4 pt-3 pb-2">
        <BackButton to={`/categories/${tool.category}`} />
        <div className="mt-0.5 rounded-md border bg-muted p-1.5">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{tool.name}</h1>
          <p className="text-xs text-muted-foreground">{tool.description}</p>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <FavoriteButton toolId={tool.id} />
        </div>
      </header>
      <Separator />
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  )
}
