import { IMAGE_SAVE_FORMATS, type ImageSaveFormat } from './types'

export {
  IMAGE_MAX_SIZES,
  IMAGE_NAMING_MODES,
  IMAGE_SAVE_FORMATS,
  type ImageConvertOptions,
  type ImageNaming,
  type ImageSaveFormat,
  type SaveImageAsState,
} from './types'
export {
  DEFAULT_SAVE_IMAGE_AS_STATE,
  getSaveImageAsState,
  normalizeSaveImageAsState,
  sanitizeFolder,
  updateSaveImageAsState,
} from './service'
export { downloadPath, suggestFilename } from './filename'
export { jpegToPdf } from './pdf'

export const IMAGE_SAVE_MENU_PREFIX = 'toolbox.save-image-as'
export const IMAGE_SAVE_MENU_PARENT = `${IMAGE_SAVE_MENU_PREFIX}.parent`
const QUICK_SEGMENT = 'quick.'

export function imageSaveMenuId(format: ImageSaveFormat, quick = false): string {
  return `${IMAGE_SAVE_MENU_PREFIX}.${quick ? QUICK_SEGMENT : ''}${format}`
}

export function formatFromMenuId(menuItemId: string): ImageSaveFormat | null {
  const prefix = `${IMAGE_SAVE_MENU_PREFIX}.`
  if (!menuItemId.startsWith(prefix) || menuItemId === IMAGE_SAVE_MENU_PARENT) return null
  let fmt = menuItemId.slice(prefix.length)
  if (fmt.startsWith(QUICK_SEGMENT)) fmt = fmt.slice(QUICK_SEGMENT.length)
  return IMAGE_SAVE_FORMATS.includes(fmt as ImageSaveFormat) ? (fmt as ImageSaveFormat) : null
}

export const FORMAT_LABELS: Record<ImageSaveFormat, string> = {
  jpg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  gif: 'GIF',
  pdf: 'PDF',
}

/** Longest-edge downscale; never upscales. */
export function fitWithin(width: number, height: number, maxSize: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (!maxSize || longest <= maxSize) return { width, height }
  const ratio = maxSize / longest
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}
