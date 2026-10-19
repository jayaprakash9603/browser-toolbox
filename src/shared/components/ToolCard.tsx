import { Link } from '@/app/router'

import type { ToolDefinition } from '@/core/registry'
import { Card } from '@/shared/components/ui/card'
import { FavoriteButton } from '@/shared/components/FavoriteButton'
import { useToolLabels } from '@/shared/hooks/useToolLabels'

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon
  const { name, description } = useToolLabels(tool)
  const preload = () => {
    void tool.loader()
  }
  return (
    <Card className="group relative h-full shadow-xs transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out hover:border-primary/35 hover:bg-accent/40 hover:shadow-sm has-[a:active]:scale-[0.99]">
      <Link
        to={tool.route}
        title={description}
        onPointerEnter={preload}
        onFocus={preload}
        className="flex h-full min-h-[var(--density-card-min-h)] flex-col gap-2 rounded-lg p-[var(--density-card-pad)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <div className="flex items-center gap-2.5 pr-8">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted transition-colors duration-150 group-hover:border-primary/30 group-hover:bg-primary/10">
            <Icon
              className="size-4 text-foreground/80 transition-colors duration-150 group-hover:text-primary"
              aria-hidden
            />
          </div>
          <span className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-snug">{name}</span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </Link>
      <div className="absolute top-2 right-2 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <FavoriteButton toolId={tool.id} />
      </div>
    </Card>
  )
}
