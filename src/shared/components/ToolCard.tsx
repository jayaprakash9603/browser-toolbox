import { Link } from '@/app/router'
import { useTranslation } from 'react-i18next'

import type { ToolDefinition } from '@/core/registry'
import { Card } from '@/shared/components/ui/card'
import { FavoriteButton } from '@/shared/components/FavoriteButton'

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { t } = useTranslation()
  const Icon = tool.icon
  const name = t(`tools.${tool.id}.name`, { defaultValue: tool.name })
  const description = t(`tools.${tool.id}.description`, { defaultValue: tool.description })
  return (
    <Card className="group relative transition-colors hover:border-foreground/20">
      <Link
        to={tool.route}
        className="flex flex-col gap-2 p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-md border bg-muted p-1.5">
            <Icon className="size-4" />
          </div>
          <span className="truncate text-xs font-semibold">{name}</span>
        </div>
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      </Link>
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <FavoriteButton toolId={tool.id} />
      </div>
    </Card>
  )
}
