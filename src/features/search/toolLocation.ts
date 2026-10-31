import type { TFunction } from 'i18next'

import { toolRegistry, type ToolDefinition } from '@/core/registry'
import { CATEGORY_TO_SECTION, getSection, getSectionForTool } from '@/core/registry/sections'
import { getWorkspaceForTool } from '@/core/registry/workspaces'
import { getToolName } from '@/i18n/toolLabels'

export function getToolLocationLabel(tool: ToolDefinition, t: TFunction): string {
  const workspace = getWorkspaceForTool(tool.id)
  const host = workspace && workspace.id !== tool.id ? toolRegistry.get(workspace.id) : undefined
  if (host) return getToolName(host, t)
  const section = getSectionForTool(tool.id) ?? getSection(CATEGORY_TO_SECTION[tool.category] ?? '')
  return section ? t(`categories.${section.id}.name`, { defaultValue: section.name }) : tool.category
}
