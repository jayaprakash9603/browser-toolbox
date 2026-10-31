import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGridIcon } from 'lucide-react'

import {
  getPrimaryTools,
  getPrimaryToolsForUserCategory,
  getUserCategories,
  getUserCategoryIdForTool,
} from '@/core/registry/userCategories'
import { getToolDescription, getToolName, getToolSearchLabels } from '@/i18n/toolLabels'

import type { ViewerSection } from '@/app/pages/all-tools/CategoryViewer'
import type { Row } from '@/app/pages/all-tools/ToolRow'

export const ALL_CATALOG = 'all'

export function useToolCatalog() {
  const { t, i18n } = useTranslation()

  const categories = useMemo(
    () =>
      getUserCategories()
        .map((category) => ({
          category,
          name: t(`categories.${category.id}.name`, { defaultValue: category.name }),
          count: getPrimaryToolsForUserCategory(category.id).length,
        }))
        .filter((entry) => entry.count > 0),
    [t],
  )

  const rows = useMemo<Row[]>(() => {
    const categoryNames = new Map(categories.map((entry) => [entry.category.id, entry.name]))
    return getPrimaryTools()
      .map((tool) => {
        const name = getToolName(tool, t)
        const description = getToolDescription(tool, t)
        const categoryName = categoryNames.get(getUserCategoryIdForTool(tool)) ?? tool.category
        return {
          tool,
          name,
          description,
          categoryName,
          haystack: [name, description, categoryName, ...getToolSearchLabels(tool), ...tool.keywords]
            .join(' ')
            .toLowerCase(),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language))
  }, [categories, t, i18n.language])

  const sections = useMemo<ViewerSection[]>(
    () => [
      {
        id: ALL_CATALOG,
        name: t('allTools.all'),
        description: t('allTools.viewer.allDescription'),
        icon: LayoutGridIcon,
        rows,
      },
      ...categories.map(({ category, name }) => ({
        id: category.id,
        name,
        description: t(`categories.${category.id}.description`, { defaultValue: category.description }),
        icon: category.icon,
        rows: rows.filter((row) => getUserCategoryIdForTool(row.tool) === category.id),
      })),
    ],
    [categories, rows, t],
  )

  const toolTotal = rows.length

  return { categories, rows, sections, toolTotal }
}
