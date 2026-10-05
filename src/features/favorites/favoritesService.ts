import { STORAGE_KEYS } from '@/core/constants'
import { eventBus } from '@/core/events'
import { get, set } from '@/core/storage'

export async function getFavorites(): Promise<string[]> {
  return (await get<string[]>(STORAGE_KEYS.favorites)) ?? []
}

export async function isFavorite(toolId: string): Promise<boolean> {
  return (await getFavorites()).includes(toolId)
}

export async function toggleFavorite(toolId: string): Promise<boolean> {
  const favorites = await getFavorites()
  const exists = favorites.includes(toolId)
  const next = exists ? favorites.filter((id) => id !== toolId) : [...favorites, toolId]
  await set(STORAGE_KEYS.favorites, next)
  eventBus.emit('TOOL_FAVORITED', { toolId, favorited: !exists })
  return !exists
}

export async function reorderFavorites(orderedIds: string[]): Promise<void> {
  await set(STORAGE_KEYS.favorites, orderedIds)
}
