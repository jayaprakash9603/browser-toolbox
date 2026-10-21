import type { InstagramFeatureDef } from './types'

export const INSTAGRAM_FEATURES: InstagramFeatureDef[] = [
  { id: 'videoControls', section: 'player', kind: 'toggle', default: true },
  { id: 'playbackSpeed', section: 'player', kind: 'select', default: '1' },
  { id: 'pictureInPicture', section: 'player', kind: 'toggle', default: true },
  { id: 'mediaDownload', section: 'download', kind: 'toggle', default: true },
  { id: 'ghostStories', section: 'privacy', kind: 'toggle', default: false },
]

export const INSTAGRAM_FEATURE_BY_ID = new Map(INSTAGRAM_FEATURES.map((f) => [f.id, f]))

export const INSTAGRAM_PLAYBACK_SPEEDS = ['0.75', '1', '1.25', '1.5', '2'] as const

export const INSTAGRAM_SECTIONS = ['player', 'download', 'privacy'] as const

export function featureLabelKey(id: string): string {
  return `sites.instagram.features.${id}.label`
}

export function featureDescKey(id: string): string {
  return `sites.instagram.features.${id}.description`
}

export function sectionLabelKey(section: InstagramFeatureDef['section']): string {
  return `sites.instagram.sections.${section}`
}
