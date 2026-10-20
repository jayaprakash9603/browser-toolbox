export const IMAGE_SAVE_FORMATS = ['jpg', 'png', 'webp', 'gif', 'pdf'] as const
export type ImageSaveFormat = (typeof IMAGE_SAVE_FORMATS)[number]

export interface SaveImageAsState {
  enabled: boolean
  formats: ImageSaveFormat[]
  /** 0.1–1.0 for JPG and WebP */
  quality: number
  askFilename: boolean
}
