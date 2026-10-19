import { useCallback, useEffect, useState } from 'react'

import {
  getProtectionState,
  getProtectionStats,
  updateProtectionState,
  type ProtectionState,
  type ProtectionStats,
} from '@/core/protection'

export function useProtection() {
  const [state, setState] = useState<ProtectionState | null>(null)
  const [stats, setStats] = useState<ProtectionStats | null>(null)

  const refreshStats = useCallback(async () => {
    setStats(await getProtectionStats())
  }, [])

  useEffect(() => {
    void Promise.all([getProtectionState(), getProtectionStats()]).then(([nextState, nextStats]) => {
      setState(nextState)
      setStats(nextStats)
    })
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== 'local') return
      if (changes.protection) setState(changes.protection.newValue as ProtectionState)
      if (changes.protectionStats) setStats(changes.protectionStats.newValue as ProtectionStats)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refreshStats])

  const patch = useCallback(async (next: Partial<ProtectionState>) => {
    setState(await updateProtectionState(next))
  }, [])

  return { state, stats, patch, refreshStats }
}
