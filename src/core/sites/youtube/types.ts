export const YOUTUBE_SECTIONS = [
  'ads',
  'feeds',
  'watch',
  'player',
  'shorts',
  'appearance',
  'progress',
  'embedded',
  'community',
] as const

export type YoutubeSection = (typeof YOUTUBE_SECTIONS)[number]

export type FeatureKind = 'toggle' | 'select' | 'number' | 'color' | 'text' | 'multiselect'

export type FeatureImpl = 'css' | 'script' | 'mirror' | 'style'

export interface YoutubeFeatureDef {
  id: string
  section: YoutubeSection
  kind: FeatureKind
  impl: FeatureImpl
  default: boolean | number | string | string[]
  /** For mirror impl: adblock field */
  mirrorKey?: 'youtubeEnabled'
  thirdParty?: boolean
  bestEffort?: boolean
  min?: number
  max?: number
  step?: number
  options?: { value: string; labelKey: string }[]
}

export type YoutubeFeatureValue = boolean | number | string | string[]

export interface YoutubeEnhancerState {
  enabled: boolean
  values: Record<string, YoutubeFeatureValue>
}
