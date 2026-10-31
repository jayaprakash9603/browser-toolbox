import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRememberedState, useScrollMemory } from '@/app/navigationMemory'
import { DemoPanel, DemoToggle } from '@/app/pages/category/DemoDisclosure'
import { useDemoOpen } from '@/app/pages/category/useDemoOpen'
import {
  getPrimaryToolsForUserCategory,
  getUserCategory,
  resolveUserCategoryId,
} from '@/core/registry/userCategories'
import { getWorkspace } from '@/core/registry/workspaces'
import { getToolSearchLabels } from '@/i18n/toolLabels'
import { BackButton } from '@/shared/components/BackButton'
import { ToolCardGrid } from '@/shared/components/ToolCardGrid'
import { EmptyState } from '@/shared/components/EmptyState'
import { SearchInput } from '@/shared/components/SearchInput'
import { InboxIcon } from 'lucide-react'

export default function CategoryPage({ categoryId: requestedId }: { categoryId: string }) {
  const { t } = useTranslation()
  const categoryId = resolveUserCategoryId(requestedId) ?? requestedId
  const [query, setQuery] = useRememberedState(`category.${categoryId}.query`, '')
  const scrollRef = useScrollMemory<HTMLDivElement>()
  const [demoOpen, toggleDemo] = useDemoOpen(categoryId)
  const demoId = useId()
  const category = getUserCategory(categoryId)
  const tools = useMemo(() => getPrimaryToolsForUserCategory(categoryId), [categoryId])
  const filteredTools = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return tools
    return tools.filter((tool) => {
      const viewLabels = getWorkspace(tool.id)?.views.map((view) => view.label) ?? []
      return [...getToolSearchLabels(tool), ...tool.keywords, ...viewLabels]
        .join(' ')
        .toLowerCase()
        .includes(search)
    })
  }, [query, tools])

  if (!category) {
    return <EmptyState icon={InboxIcon} title={t('category.unknown')} />
  }

  const Icon = category.icon
  return (
    <div ref={scrollRef} className="@container h-full overflow-y-auto p-[var(--density-page-pad)]">
      <div className="mb-4 flex items-center gap-2.5">
        <BackButton />
        <div className="rounded-md border bg-muted p-1.5">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold">
            {t(`categories.${category.id}.name`, { defaultValue: category.name })}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(`categories.${category.id}.description`, { defaultValue: category.description })}
          </p>
        </div>
        {tools.length > 0 && (
          <DemoToggle id={`${demoId}-toggle`} panelId={`${demoId}-panel`} open={demoOpen} onToggle={toggleDemo} />
        )}
      </div>
      {tools.length > 0 && (
        <DemoPanel
          id={`${demoId}-panel`}
          labelledBy={`${demoId}-toggle`}
          open={demoOpen}
          tools={tools}
          resetKey={category.id}
        />
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
      ) : (
        <ToolCardGrid tools={filteredTools} />
      )}
    </div>
  )
}
