import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { BackButton } from '@/shared/components/BackButton'
import { ToolCard } from '@/shared/components/ToolCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { InboxIcon } from 'lucide-react'

export default function CategoryPage({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const category = categoryRegistry.get(categoryId)
  const tools = toolRegistry.getByCategory(categoryId)
  const filteredTools = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return tools
    return tools.filter((tool) =>
      [
        t(`tools.${tool.id}.name`, { defaultValue: tool.name }),
        t(`tools.${tool.id}.description`, { defaultValue: tool.description }),
        ...tool.keywords,
      ].join(' ').toLowerCase().includes(search),
    )
  }, [query, tools, t])

  if (!category) {
    return <EmptyState icon={InboxIcon} title={t('category.unknown')} />
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
          <h1 className="text-sm font-semibold">
            {t(`categories.${category.id}.name`, { defaultValue: category.name })}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(`categories.${category.id}.description`, { defaultValue: category.description })}
          </p>
        </div>
      </div>
      {tools.length > 0 && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('category.searchPlaceholder', {
            category: t(`categories.${category.id}.name`, { defaultValue: category.name }).toLowerCase(),
          })}
          ariaLabel={t('category.searchPlaceholder', {
            category: t(`categories.${category.id}.name`, { defaultValue: category.name }),
          })}
          className="mb-3"
        />
      )}
      {filteredTools.length === 0 ? (
        query ? (
          <EmptyState icon={InboxIcon} title={t('category.noMatches')} description={t('category.trySearchAgain')} />
        ) : (
        <EmptyState icon={InboxIcon} title={t('category.noTools')} />
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
