import './i18n'
import { toolRegistry } from '@/core/registry'

export function useCalcTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}
