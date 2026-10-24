import { useCallback, useEffect, useState } from 'react'

import { get, set } from '@/core/storage'

export type ReaderTextSize = 'sm' | 'md' | 'lg'

export interface ReadAloudPrefs {
  /** `auto` picks a voice that matches the text's language. */
  voiceUri: string
  rate: number
  pitch: number
  volume: number
  textSize: ReaderTextSize
  follow: boolean
  highlightWords: boolean
  skipUrls: boolean
  skipCitations: boolean
  readCode: boolean
}

export const AUTO_VOICE = 'auto'

export const DEFAULT_READ_ALOUD_PREFS: ReadAloudPrefs = {
  voiceUri: AUTO_VOICE,
  rate: 1,
  pitch: 1,
  volume: 1,
  textSize: 'md',
  follow: true,
  highlightWords: true,
  skipUrls: true,
  skipCitations: true,
  readCode: false,
}

export const RATE_RANGE = { min: 0.5, max: 3, step: 0.05 } as const
export const PITCH_RANGE = { min: 0.5, max: 2, step: 0.05 } as const

const PREFS_KEY = 'readAloud.prefs'
const SAVE_DELAY_MS = 250

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback
}

function sanitize(stored: Partial<ReadAloudPrefs>): ReadAloudPrefs {
  const base = DEFAULT_READ_ALOUD_PREFS
  const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
  return {
    voiceUri: typeof stored.voiceUri === 'string' && stored.voiceUri ? stored.voiceUri : base.voiceUri,
    rate: clamp(stored.rate, RATE_RANGE.min, RATE_RANGE.max, base.rate),
    pitch: clamp(stored.pitch, PITCH_RANGE.min, PITCH_RANGE.max, base.pitch),
    volume: clamp(stored.volume, 0, 1, base.volume),
    textSize: stored.textSize === 'sm' || stored.textSize === 'lg' ? stored.textSize : 'md',
    follow: flag(stored.follow, base.follow),
    highlightWords: flag(stored.highlightWords, base.highlightWords),
    skipUrls: flag(stored.skipUrls, base.skipUrls),
    skipCitations: flag(stored.skipCitations, base.skipCitations),
    readCode: flag(stored.readCode, base.readCode),
  }
}

export function useReadAloudPrefs() {
  const [prefs, setPrefs] = useState<ReadAloudPrefs>(DEFAULT_READ_ALOUD_PREFS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    get<Partial<ReadAloudPrefs>>(PREFS_KEY)
      .then((stored) => {
        if (!alive) return
        if (stored) setPrefs(sanitize(stored))
        setLoaded(true)
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    const timer = window.setTimeout(() => void set(PREFS_KEY, prefs).catch(() => undefined), SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [prefs, loaded])

  const update = useCallback((patch: Partial<ReadAloudPrefs>) => setPrefs((prev) => ({ ...prev, ...patch })), [])
  const reset = useCallback(() => setPrefs(DEFAULT_READ_ALOUD_PREFS), [])

  return { prefs, update, reset }
}
