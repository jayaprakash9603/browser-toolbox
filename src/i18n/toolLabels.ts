import type { TFunction } from 'i18next'
import i18n from 'i18next'

import type { ToolDefinition } from '@/core/registry'

export function getToolName(tool: ToolDefinition, t: TFunction = i18n.t.bind(i18n)): string {
  return t(`tools.${tool.id}.name`, { defaultValue: tool.name })
}

export function getToolDescription(tool: ToolDefinition, t: TFunction = i18n.t.bind(i18n)): string {
  return t(`tools.${tool.id}.description`, { defaultValue: tool.description })
}

export function getToolSearchLabels(tool: ToolDefinition): string[] {
  return [getToolName(tool), getToolDescription(tool)]
}
