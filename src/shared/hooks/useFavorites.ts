import { useCallback, useEffect, useState } from 'react'

import {
  getFavorites,
  reorderFavorites,
  toggleFavorite,
} from '@/features/favorites/favoritesService'

let cachedFavorites: string[] | null = null

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(cachedFavorites ?? [])
  const [isLoading, setIsLoading] = useState(cachedFavorites === null)

  const refresh = useCallback(async () => {
    cachedFavorites = await getFavorites()
    setFavorites(cachedFavorites)
  }, [])

  useEffect(() => {
    let live = true
    void getFavorites().then((list) => {
      cachedFavorites = list
      if (live) setFavorites(list)
    }).finally(() => {
      if (live) setIsLoading(false)
    })
    return () => {
      live = false
    }
  }, [])

  const toggle = useCallback(
    async (toolId: string) => {
      await toggleFavorite(toolId)
      await refresh()
    },
    [refresh],
  )

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      await reorderFavorites(orderedIds)
      await refresh()
    },
    [refresh],
  )

  return { favorites, toggle, reorder, refresh, isLoading }
}
