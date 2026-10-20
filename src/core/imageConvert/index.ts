import { IMAGE_SAVE_FORMATS, type ImageSaveFormat } from './types'

export { IMAGE_SAVE_FORMATS, type ImageSaveFormat, type SaveImageAsState } from './types'
export {
  DEFAULT_SAVE_IMAGE_AS_STATE,
  getSaveImageAsState,
  updateSaveImageAsState,
} from './service'
export { suggestFilename } from './filename'
export { jpegToPdf } from './pdf'

export const IMAGE_SAVE_MENU_PREFIX = 'toolbox.save-image-as'
export const IMAGE_SAVE_MENU_PARENT = `${IMAGE_SAVE_MENU_PREFIX}.parent`

export function imageSaveMenuId(format: ImageSaveFormat): string {
  return `${IMAGE_SAVE_MENU_PREFIX}.${format}`
}

export function formatFromMenuId(menuItemId: string): ImageSaveFormat | null {
  const prefix = `${IMAGE_SAVE_MENU_PREFIX}.`
  if (!menuItemId.startsWith(prefix) || menuItemId === IMAGE_SAVE_MENU_PARENT) return null
  const fmt = menuItemId.slice(prefix.length)
  return IMAGE_SAVE_FORMATS.includes(fmt as ImageSaveFormat) ? (fmt as ImageSaveFormat) : null
}

export const FORMAT_LABELS: Record<ImageSaveFormat, string> = {
  jpg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  gif: 'GIF',
  pdf: 'PDF',
}
