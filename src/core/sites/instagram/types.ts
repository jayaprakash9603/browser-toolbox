export type InstagramFeatureValue = boolean | number | string

export type InstagramEnhancerState = {
  enabled: boolean
  values: Record<string, InstagramFeatureValue>
}

export type InstagramFeatureDef = {
  id: string
  section: 'player' | 'privacy' | 'download'
  kind: 'toggle' | 'select'
  default: InstagramFeatureValue
}
