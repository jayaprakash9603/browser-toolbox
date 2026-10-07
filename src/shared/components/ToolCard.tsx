import { Link } from '@/app/router'

import type { ToolDefinition } from '@/core/registry'
import { Card } from '@/shared/components/ui/card'
import { FavoriteButton } from '@/shared/components/FavoriteButton'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  return (
    <Card className="group relative transition-colors hover:border-foreground/25 hover:shadow-sm">
      <Link
        to={tool.route}
        className="flex min-h-[4.5rem] flex-col gap-2 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <div className="flex items-center gap-2.5 pr-7">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted">
            <Icon className="size-4 text-foreground/80" aria-hidden />
          </div>
          <span className="truncate text-xs font-semibold leading-tight">{name}</span>
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      </Link>
      <div className="absolute top-2 right-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <FavoriteButton toolId={tool.id} />
      </div>
    </Card>
  )
}
