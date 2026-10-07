import { toolRegistry } from '@/core/registry'

export function useSeoTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}

export async function getPageInfo(): Promise<import('@/chrome/content/index').PageInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id == null) return null
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' })
    return (response?.data ?? response) as import('@/chrome/content/index').PageInfo
  } catch {
    return null
  }
}
