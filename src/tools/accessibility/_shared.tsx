import { toolRegistry } from '@/core/registry'

export function useAccessibilityTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}
