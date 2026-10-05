import { useMemo, useState } from 'react'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { BackButton } from '@/shared/components/BackButton'
import { ToolCard } from '@/shared/components/ToolCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { InboxIcon } from 'lucide-react'

export default function CategoryPage({ categoryId }: { categoryId: string }) {
  const [query, setQuery] = useState('')
  const category = categoryRegistry.get(categoryId)
  const tools = toolRegistry.getByCategory(categoryId)
  const filteredTools = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return tools
    return tools.filter((tool) =>
      [tool.name, tool.description, ...tool.keywords].join(' ').toLowerCase().includes(search),
    )
  }, [query, tools])

  if (!category) {
    return <EmptyState icon={InboxIcon} title="Unknown category" />
  }

  const Icon = category.icon
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <BackButton />
        <div className="rounded-md border bg-muted p-1.5">
          <Icon className="size-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">{category.name}</h1>
          <p className="text-xs text-muted-foreground">{category.description}</p>
        </div>
      </div>
      {tools.length > 0 && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Search ${category.name.toLowerCase()} tools…`}
          ariaLabel={`Search ${category.name} tools`}
          className="mb-3"
        />
      )}
      {filteredTools.length === 0 ? (
        query ? (
          <EmptyState icon={InboxIcon} title="No matching tools" description="Try a different search." />
        ) : (
        <EmptyState icon={InboxIcon} title="No tools in this category yet" />
        )
      ) : (
        <div className="grid grid-cols-1 gap-2 @[360px]:grid-cols-2 @[560px]:grid-cols-3">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
