import type { ToolDefinition } from '@/core/registry'
import { ToolCard } from '@/shared/components/ToolCard'
import { cn } from '@/shared/utils/cn'

interface ToolCardGridProps {
  tools: ToolDefinition[]
  className?: string
}

export function toolCardGridClassName(className?: string) {
  return cn(
    'grid grid-cols-1 gap-[var(--density-grid-gap)]',
    '@[440px]:grid-cols-2',
    '@[680px]:grid-cols-3',
    '@[920px]:grid-cols-4',
    className,
  )
}

export function ToolCardGrid({ tools, className }: ToolCardGridProps) {
  return (
    <div className={toolCardGridClassName(className)}>
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  )
}
