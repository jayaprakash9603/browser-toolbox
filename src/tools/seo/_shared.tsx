import { toolRegistry } from '@/core/registry'

import { loadPageInfo, type PageLoadResult } from './pageDataClient'

export function useSeoTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}

export async function getPageInfo(): Promise<import('@/chrome/content/index').PageInfo | null> {
  const result = await loadPageInfo()
  return result.ok ? result.data : null
}

export type { PageLoadResult }
