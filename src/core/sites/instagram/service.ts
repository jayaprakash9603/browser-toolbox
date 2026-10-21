import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { INSTAGRAM_FEATURES } from './features'
import type { InstagramEnhancerState, InstagramFeatureValue } from './types'

export function defaultInstagramValues(): Record<string, InstagramFeatureValue> {
  const values: Record<string, InstagramFeatureValue> = {}
  for (const f of INSTAGRAM_FEATURES) values[f.id] = f.default
  return values
}

export const DEFAULT_INSTAGRAM_ENHANCER_STATE: InstagramEnhancerState = {
  enabled: false,
  values: defaultInstagramValues(),
}

export async function getInstagramEnhancerState(): Promise<InstagramEnhancerState> {
  const stored = await get<Partial<InstagramEnhancerState>>(STORAGE_KEYS.instagramEnhancer)
  if (!stored) return { ...DEFAULT_INSTAGRAM_ENHANCER_STATE, values: defaultInstagramValues() }
  return {
    enabled: stored.enabled ?? DEFAULT_INSTAGRAM_ENHANCER_STATE.enabled,
    values: { ...defaultInstagramValues(), ...stored.values },
  }
}

export async function updateInstagramEnhancerState(
  patch: Partial<InstagramEnhancerState> & { values?: Partial<Record<string, InstagramFeatureValue>> },
): Promise<InstagramEnhancerState> {
  const current = await getInstagramEnhancerState()
  const next: InstagramEnhancerState = {
    enabled: patch.enabled ?? current.enabled,
    values: { ...current.values, ...patch.values },
  }
  await set(STORAGE_KEYS.instagramEnhancer, next)
  return next
}
