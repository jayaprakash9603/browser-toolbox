import { useCallback, useState } from 'react'

import { ALL_DIGESTS, type DigestAlgorithm } from '@/core/engines/hash/digests'

const KEY = 'tbx.hash.digestPreset'

export type DigestPreset = 'full' | 'forensic' | 'quick'

const PRESET_ALGORITHMS: Record<DigestPreset, readonly DigestAlgorithm[]> = {
  full: ALL_DIGESTS,
  forensic: ['SHA-256', 'SHA-512', 'MD5', 'CRC32'],
  quick: ['SHA-256'],
}

function readPreset(): DigestPreset {
  try {
    const value = localStorage.getItem(KEY)
    if (value === 'full' || value === 'forensic' || value === 'quick') return value
  } catch {
    /* ignore */
  }
  return 'forensic'
}

export function useDigestSettings() {
  const [preset, setPresetState] = useState<DigestPreset>(readPreset)
  const algorithms = PRESET_ALGORITHMS[preset]
  const setPreset = useCallback((next: DigestPreset) => {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
    setPresetState(next)
  }, [])
  return { preset, setPreset, algorithms }
}

export const DIGEST_PRESETS: readonly DigestPreset[] = ['quick', 'forensic', 'full']
