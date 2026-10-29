import { useCallback, useEffect, useState } from 'react'

import { getRecentTools, type RecentTool } from '@/features/recent-tools/recentToolsService'

let cachedRecent: RecentTool[] | null = null

export function useRecentTools() {
  const [recent, setRecent] = useState<RecentTool[]>(cachedRecent ?? [])
  const [isLoading, setIsLoading] = useState(cachedRecent === null)

  const refresh = useCallback(async () => {
    cachedRecent = await getRecentTools()
    setRecent(cachedRecent)
  }, [])

  useEffect(() => {
    let live = true
    void getRecentTools().then((list) => {
      cachedRecent = list
      if (live) setRecent(list)
    }).finally(() => {
      if (live) setIsLoading(false)
    })
    return () => {
      live = false
    }
  }, [])

  return { recent, refresh, isLoading }
}
