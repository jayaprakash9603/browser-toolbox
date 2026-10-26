export const IMAGE_SAVE_FORMATS = ['jpg', 'png', 'webp', 'gif', 'pdf'] as const
export type ImageSaveFormat = (typeof IMAGE_SAVE_FORMATS)[number]

export const IMAGE_NAMING_MODES = ['title', 'image', 'site'] as const
/** title: page title · image: original file name · site: hostname + timestamp */
export type ImageNaming = (typeof IMAGE_NAMING_MODES)[number]

/** Longest-edge limits offered for downscaling; 0 keeps the original size. */
export const IMAGE_MAX_SIZES = [0, 3840, 2560, 1920, 1280, 1024, 640] as const

export interface SaveImageAsState {
  enabled: boolean
  /** Enabled formats, in context-menu order. */
  formats: ImageSaveFormat[]
  /** 0.1–1.0 for JPG, WebP and PDF */
  quality: number
  askFilename: boolean
  /** Adds a one-click "Save image as X" item next to the submenu. */
  quickFormat: ImageSaveFormat | null
  /** Longest edge in px; 0 = original size. */
  maxSize: number
  /** Fill for transparent pixels in formats without alpha (JPG, PDF). */
  background: string
  naming: ImageNaming
  /** Subfolder inside Downloads; empty saves to Downloads directly. */
  folder: string
  notifyOnSave: boolean
}

export interface ImageConvertOptions {
  quality: number
  maxSize: number
  background: string
}
