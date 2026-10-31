import { STORAGE_KEYS } from '@/core/constants'
import { toolRegistry } from '@/core/registry'
import { get, set } from '@/core/storage'

import type { RecentTool } from '@/features/recent-tools/recentToolsService'

function isKnownTool(toolId: string): boolean {
  return toolRegistry.get(toolId) !== undefined
}

export async function pruneRemovedTools(): Promise<void> {
  const favorites = (await get<string[]>(STORAGE_KEYS.favorites)) ?? []
  const keptFavorites = favorites.filter(isKnownTool)
  if (keptFavorites.length !== favorites.length) await set(STORAGE_KEYS.favorites, keptFavorites)

  const recent = (await get<RecentTool[]>(STORAGE_KEYS.recentTools)) ?? []
  const keptRecent = recent.filter((entry) => isKnownTool(entry.toolId))
  if (keptRecent.length !== recent.length) await set(STORAGE_KEYS.recentTools, keptRecent)
}
