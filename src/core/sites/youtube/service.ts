import { STORAGE_KEYS } from '@/core/constants'
import { requestPermissions } from '@/core/permissions/siteAccess'
import { get, set } from '@/core/storage'

import { YOUTUBE_MATCHES } from './constants'
import { YOUTUBE_FEATURES } from './features'
import type { YoutubeEnhancerState, YoutubeFeatureValue } from './types'
import { PROGRESS_THEMES } from './progressThemes'

export function defaultYoutubeValues(): Record<string, YoutubeFeatureValue> {
  const values: Record<string, YoutubeFeatureValue> = {}
  for (const f of YOUTUBE_FEATURES) {
    if (f.impl === 'mirror') continue
    values[f.id] = f.default
  }
  const themeOptions = PROGRESS_THEMES.map((t) => t.id)
  if (!themeOptions.includes(String(values.progressTheme))) values.progressTheme = 'default'
  return values
}

export const DEFAULT_YOUTUBE_ENHANCER_STATE: YoutubeEnhancerState = {
  enabled: false,
  values: defaultYoutubeValues(),
}

export async function getYoutubeEnhancerState(): Promise<YoutubeEnhancerState> {
  const stored = await get<Partial<YoutubeEnhancerState>>(STORAGE_KEYS.youtubeEnhancer)
  if (!stored) return { ...DEFAULT_YOUTUBE_ENHANCER_STATE, values: defaultYoutubeValues() }
  return {
    enabled: stored.enabled ?? DEFAULT_YOUTUBE_ENHANCER_STATE.enabled,
    values: { ...defaultYoutubeValues(), ...stored.values },
  }
}

export async function updateYoutubeEnhancerState(
  patch: Partial<YoutubeEnhancerState> & { values?: Partial<Record<string, YoutubeFeatureValue>> },
): Promise<YoutubeEnhancerState> {
  const current = await getYoutubeEnhancerState()
  if (patch.enabled && !current.enabled && !(await requestPermissions({ origins: [...YOUTUBE_MATCHES] }))) {
    return current
  }
  const next: YoutubeEnhancerState = {
    enabled: patch.enabled ?? current.enabled,
    values: { ...current.values, ...patch.values },
  }
  await set(STORAGE_KEYS.youtubeEnhancer, next)
  return next
}

export function countActiveFeatures(state: YoutubeEnhancerState): number {
  if (!state.enabled) return 0
  let n = 0
  for (const f of YOUTUBE_FEATURES) {
    if (f.impl === 'mirror') continue
    const v = state.values[f.id]
    if (f.kind === 'toggle' && v === true) n++
    if (f.kind === 'number' && typeof v === 'number' && v !== f.default) n++
    if (f.kind === 'select' && v !== f.default) n++
    if (f.kind === 'color' && v !== f.default) n++
    if (f.kind === 'text' && typeof v === 'string' && v.trim()) n++
    if (f.kind === 'multiselect' && Array.isArray(v) && !sameSet(v, f.default)) n++
  }
  return n
}

function sameSet(value: unknown[], fallback: unknown): boolean {
  const base = Array.isArray(fallback) ? fallback.map(String) : []
  const next = new Set(value.map(String))
  return next.size === new Set(base).size && base.every((item) => next.has(item))
}
