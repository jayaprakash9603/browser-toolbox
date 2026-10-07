import { useTranslation } from 'react-i18next'

import type { ToolDefinition } from '@/core/registry'
import { getToolDescription, getToolName } from '@/i18n/toolLabels'

export function useToolLabels(tool: ToolDefinition) {
  const { t } = useTranslation()
  return {
    name: getToolName(tool, t),
    description: getToolDescription(tool, t),
  }
}
