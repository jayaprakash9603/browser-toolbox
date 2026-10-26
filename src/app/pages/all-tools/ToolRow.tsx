import { ChevronRightIcon } from 'lucide-react'

import { Link } from '@/app/router'
import type { ToolDefinition } from '@/core/registry'

export interface Row {
  tool: ToolDefinition
  name: string
  description: string
  categoryName: string
  haystack: string
}

export function ToolRow({ row, showCategory }: { row: Row; showCategory: boolean }) {
  const { tool, name, description, categoryName } = row
  const Icon = tool.icon
  const preload = () => {
    void tool.loader()
  }
  return (
    <Link
      to={tool.route}
      onPointerEnter={preload}
      onFocus={preload}
      className="group flex min-h-14 items-center gap-2.5 rounded-xl border bg-card px-2.5 py-2 outline-none transition-colors duration-200 hover:border-primary/35 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground/75 transition-[color,background-color,rotate] duration-200 group-hover:-rotate-6 group-hover:bg-primary/10 group-hover:text-primary motion-reduce:group-hover:rotate-0 [&_svg]:size-[18px]">
        <Icon aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[13px] leading-5 font-semibold">{name}</span>
          {showCategory && (
            <span className="hidden shrink-0 rounded-full bg-muted px-1.5 text-[10px] leading-4 font-medium text-muted-foreground @[400px]:inline">
              {categoryName}
            </span>
          )}
        </span>
        <span className="truncate text-[11px] leading-4 text-muted-foreground">{description}</span>
      </span>
      <ChevronRightIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground/50 transition-[translate,color] duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
      />
    </Link>
  )
}
