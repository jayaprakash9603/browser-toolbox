import { PAGE_SIZES_PT } from './document'
import type { PdfLayout } from './pdfLayout'

export type ImagePageSize = 'a4' | 'letter' | 'fit'
export type ImageOrientation = 'auto' | 'portrait' | 'landscape'
export type ImageMargin = 'none' | 'small' | 'normal'
export type ImageFit = 'contain' | 'cover'

export interface ImagePdfOptions {
  pageSize: ImagePageSize
  orientation: ImageOrientation
  margin: ImageMargin
  fit: ImageFit
}

export const DEFAULT_IMAGE_PDF_OPTIONS: ImagePdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  margin: 'small',
  fit: 'contain',
}

const IMAGE_MARGINS: Record<ImageMargin, number> = { none: 0, small: 18, normal: 36 }
/** CSS pixels are 1/96 inch; PDF points are 1/72 inch. */
const PX_TO_PT = 0.75

export interface ImagePlacement {
  pageWidth: number
  pageHeight: number
  x: number
  y: number
  w: number
  h: number
}

export function placeImage(width: number, height: number, options: ImagePdfOptions): ImagePlacement {
  const margin = IMAGE_MARGINS[options.margin]
  const w = Math.max(1, width) * PX_TO_PT
  const h = Math.max(1, height) * PX_TO_PT
  if (options.pageSize === 'fit') {
    return { pageWidth: w + margin * 2, pageHeight: h + margin * 2, x: margin, y: margin, w, h }
  }
  const [short, long] = PAGE_SIZES_PT[options.pageSize]
  const landscape = options.orientation === 'landscape' || (options.orientation === 'auto' && width > height)
  const pageWidth = landscape ? long : short
  const pageHeight = landscape ? short : long
  const ratio =
    options.fit === 'cover'
      ? Math.max(pageWidth / w, pageHeight / h)
      : Math.min((pageWidth - margin * 2) / w, (pageHeight - margin * 2) / h)
  const drawW = w * ratio
  const drawH = h * ratio
  return { pageWidth, pageHeight, x: (pageWidth - drawW) / 2, y: (pageHeight - drawH) / 2, w: drawW, h: drawH }
}

export interface PdfImageSource {
  src: string
  width: number
  height: number
  format: 'PNG' | 'JPEG'
}

export function layoutImagesPdf(images: PdfImageSource[], options: ImagePdfOptions, title = 'Images'): PdfLayout {
  return {
    title,
    lossyGlyphs: false,
    pages: images.map((image) => {
      const place = placeImage(image.width, image.height, options)
      return {
        width: place.pageWidth,
        height: place.pageHeight,
        items: [{ kind: 'image', x: place.x, y: place.y, w: place.w, h: place.h, src: image.src, format: image.format }],
      }
    }),
  }
}
