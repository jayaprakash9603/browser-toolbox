import { MAX_RECENT_TOOLS, STORAGE_KEYS } from '@/core/constants'
import { get, remove, set } from '@/core/storage'

export interface RecentTool {
  toolId: string
  openedAt: number
}

export async function getRecentTools(): Promise<RecentTool[]> {
  return (await get<RecentTool[]>(STORAGE_KEYS.recentTools)) ?? []
}

export async function trackRecentTool(toolId: string): Promise<void> {
  const recent = (await getRecentTools()).filter((entry) => entry.toolId !== toolId)
  recent.unshift({ toolId, openedAt: Date.now() })
  await set(STORAGE_KEYS.recentTools, recent.slice(0, MAX_RECENT_TOOLS))
}

export async function clearRecentTools(): Promise<void> {
  await remove(STORAGE_KEYS.recentTools)
}

export async function removeRecentTool(toolId: string): Promise<void> {
  const recent = (await getRecentTools()).filter((entry) => entry.toolId !== toolId)
  await set(STORAGE_KEYS.recentTools, recent)
}
