import { toolRegistry } from './toolRegistry'
import { CATEGORY_TO_SECTION, SECTIONS, getSection, getSectionForTool, isPrimaryTool } from './sections'
import type { CategoryDefinition, ToolDefinition } from './types'

export function getUserCategories(): CategoryDefinition[] {
  return SECTIONS.map((section, index) => ({
    id: section.id,
    name: section.name,
    description: section.description,
    icon: section.icon,
    order: index,
    enabled: true,
  }))
}

export function getUserCategory(id: string): CategoryDefinition | undefined {
  return getUserCategories().find((category) => category.id === id)
}

export function resolveUserCategoryId(id: string): string | undefined {
  if (getSection(id)) return id
  return CATEGORY_TO_SECTION[id]
}

export function getUserCategoryIdForTool(tool: ToolDefinition): string {
  return getSectionForTool(tool.id)?.id ?? CATEGORY_TO_SECTION[tool.category] ?? SECTIONS[0].id
}

export function getPrimaryToolsForUserCategory(sectionId: string): ToolDefinition[] {
  const section = getSection(sectionId)
  if (!section) return []
  return section.toolIds
    .map((id) => toolRegistry.get(id))
    .filter((tool): tool is ToolDefinition => tool !== undefined && isPrimaryTool(tool))
}

export function getPrimaryTools(): ToolDefinition[] {
  return SECTIONS.flatMap((section) => getPrimaryToolsForUserCategory(section.id))
}
