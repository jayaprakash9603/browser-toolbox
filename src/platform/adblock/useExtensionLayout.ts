import { useEffect, useState } from 'react'

import { getAdblockRuntimeProfile } from './runtime'

const NARROW_PX = 420

export interface ExtensionLayoutInfo {
  isNarrow: boolean
  isMobileFirefox: boolean
  networkStatsPartial: boolean
}

export function useExtensionLayout(): ExtensionLayoutInfo {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < NARROW_PX : false,
  )

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_PX)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const profile = getAdblockRuntimeProfile()

  return {
    isNarrow,
    isMobileFirefox: profile.kind === 'mobile_firefox',
    networkStatsPartial: profile.networkStatsMode !== 'feedback',
  }
}
