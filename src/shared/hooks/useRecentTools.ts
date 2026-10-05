import { useCallback, useEffect, useState } from 'react'

import { getRecentTools, type RecentTool } from '@/features/recent-tools/recentToolsService'

export function useRecentTools() {
  const [recent, setRecent] = useState<RecentTool[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setRecent(await getRecentTools())
  }, [])

  useEffect(() => {
    let live = true
    void getRecentTools().then((list) => {
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
