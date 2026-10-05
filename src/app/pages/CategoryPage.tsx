import { categoryRegistry, toolRegistry } from '@/core/registry'
import { ToolCard } from '@/shared/components/ToolCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { InboxIcon } from 'lucide-react'

export default function CategoryPage({ categoryId }: { categoryId: string }) {
  const category = categoryRegistry.get(categoryId)
  const tools = toolRegistry.getByCategory(categoryId)

  if (!category) {
    return <EmptyState icon={InboxIcon} title="Unknown category" />
  }

  const Icon = category.icon
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="rounded-md border bg-muted p-1.5">
          <Icon className="size-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">{category.name}</h1>
          <p className="text-xs text-muted-foreground">{category.description}</p>
        </div>
      </div>
      {tools.length === 0 ? (
        <EmptyState icon={InboxIcon} title="No tools in this category yet" />
      ) : (
        <div className="grid grid-cols-1 gap-2 @[360px]:grid-cols-2 @[520px]:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
