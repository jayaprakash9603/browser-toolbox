export type ImageSource = 'img' | 'picture' | 'css' | 'svg' | 'link' | 'meta' | 'video'

export interface PageImage {
  url: string
  source: ImageSource
  width: number
  height: number
  alt: string | null
  ext: string | null
}

export type ImageFileExt = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif' | 'svg' | 'avif' | 'bmp' | 'ico' | 'unknown'

export interface ImageFilterState {
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
  types: ImageFileExt[]
  sources: ImageSource[]
  urlQuery: string
  hideDuplicates: boolean
}

export type ImageDownloadMode = 'files' | 'zip'

export type GridDensity = 's' | 'm' | 'l'
