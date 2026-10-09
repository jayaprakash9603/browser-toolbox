import { useCallback, useEffect, useState } from 'react'

import {
  getFavorites,
  reorderFavorites,
  toggleFavorite,
} from '@/features/favorites/favoritesService'

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setFavorites(await getFavorites())
  }, [])

  useEffect(() => {
    let live = true
    void getFavorites().then((list) => {
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
