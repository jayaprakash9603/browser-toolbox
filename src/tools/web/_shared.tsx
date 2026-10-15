import { getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { toolRegistry } from '@/core/registry'

export function useWebTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return getActiveBrowserTab()
}

export async function getPageInfo(): Promise<import('@/chrome/content/index').PageInfo | null> {
  const tab = await getActiveTab()
  if (tab?.id == null) return null
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' })
    return (response?.data ?? response) as import('@/chrome/content/index').PageInfo
  } catch {
    return null
  }
}
