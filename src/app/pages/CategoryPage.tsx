import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { categoryRegistry, groupToolsByToolkit, toolRegistry } from '@/core/registry'
import { getToolSearchLabels } from '@/i18n/toolLabels'
import { BackButton } from '@/shared/components/BackButton'
import { ToolCardGrid } from '@/shared/components/ToolCardGrid'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { InboxIcon } from 'lucide-react'

const CategoryDemoPlayer = lazy(() => import('@/app/pages/category/CategoryDemoPlayer'))

export default function CategoryPage({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const category = categoryRegistry.get(categoryId)
  const tools = toolRegistry.getByCategory(categoryId)
  const filteredTools = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return tools
    return tools.filter((tool) =>
      [...getToolSearchLabels(tool), ...tool.keywords].join(' ').toLowerCase().includes(search),
    )
  }, [query, tools])

  const grouped = useMemo(() => groupToolsByToolkit(filteredTools), [filteredTools])
  const showGrouped = grouped.length > 1

  if (!category) {
    return <EmptyState icon={InboxIcon} title={t('category.unknown')} />
  }

  const Icon = category.icon
  return (
    <div className="@container h-full overflow-y-auto p-[var(--density-page-pad)]">
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
        <Suspense fallback={<div aria-hidden className="mb-4 h-11 rounded-2xl border bg-card" />}>
          <CategoryDemoPlayer key={category.id} tools={tools} />
        </Suspense>
      )}
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
      ) : showGrouped ? (
        <div className="flex flex-col gap-4">
          {grouped.map((section) => (
            <section key={section.id}>
              <h2 className="mb-2 text-xs font-semibold text-muted-foreground">
                {t(section.labelKey, { defaultValue: section.id })}
              </h2>
              <ToolCardGrid tools={section.tools} />
            </section>
          ))}
        </div>
      ) : (
        <ToolCardGrid tools={filteredTools} />
      )}
    </div>
  )
}
