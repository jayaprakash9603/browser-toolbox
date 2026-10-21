import type { InstagramEnhancerState, InstagramFeatureValue } from './types'

export function isFeatureOn(values: Record<string, InstagramFeatureValue>, id: string): boolean {
  return values[id] === true
}

export function playbackRate(values: Record<string, InstagramFeatureValue>): number {
  const raw = values.playbackSpeed
  const n = typeof raw === 'string' ? Number.parseFloat(raw) : typeof raw === 'number' ? raw : 1
  return Number.isFinite(n) && n > 0 ? n : 1
}

export function countActiveFeatures(state: InstagramEnhancerState): number {
  if (!state.enabled) return 0
  let n = 0
  if (isFeatureOn(state.values, 'videoControls')) n++
  if (isFeatureOn(state.values, 'pictureInPicture')) n++
  if (isFeatureOn(state.values, 'mediaDownload')) n++
  if (isFeatureOn(state.values, 'ghostStories')) n++
  if (playbackRate(state.values) !== 1) n++
  return n
}
