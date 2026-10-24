import { toWinAnsi } from '@/core/engines/files/pdfLayout'
import type { FontKey, RasterText } from '@/core/engines/pdf/edit'
import { canvasToBlob } from '@/core/engines/pdf/pdfjs'

export const CSS_FONTS: Record<FontKey, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
}

/** Device pixels per point for text and signatures drawn as images. */
const RASTER_SCALE = 4

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available in this browser.')
  return context
}

async function canvasBytes(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Uint8Array> {
  return new Uint8Array(await (await canvasToBlob(canvas, type, quality)).arrayBuffer())
}

export interface TextStyle {
  fontSize: number
  font: FontKey
  bold?: boolean
  color: string
}

/** Width in points of `text` in the given style, measured with the browser's font. */
export function measureText(text: string, style: Pick<TextStyle, 'fontSize' | 'font' | 'bold'>): number {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return text.length * style.fontSize * 0.55
  context.font = `${style.bold ? 'bold ' : ''}${style.fontSize}px ${CSS_FONTS[style.font]}`
  return context.measureText(text).width
}

/** Draws text the built-in PDF fonts cannot encode (emoji, non-Latin scripts) as a transparent PNG. */
export async function rasterizeText(text: string, style: TextStyle): Promise<RasterText> {
  const lines = text.split('\n')
  const lineHeight = style.fontSize * 1.2
  const width = Math.max(1, ...lines.map((line) => measureText(line, style))) + style.fontSize * 0.1
  const height = lines.length * lineHeight
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * RASTER_SCALE)
  canvas.height = Math.ceil(height * RASTER_SCALE)
  const context = context2d(canvas)
  context.scale(RASTER_SCALE, RASTER_SCALE)
  context.font = `${style.bold ? 'bold ' : ''}${style.fontSize}px ${CSS_FONTS[style.font]}`
  context.fillStyle = style.color
  context.textBaseline = 'alphabetic'
  lines.forEach((line, index) => context.fillText(line, 0, index * lineHeight + style.fontSize * 0.947))
  return { bytes: await canvasBytes(canvas), width, height }
}

/** Text ready for the standard PDF fonts, or an image of it when they cannot encode every character. */
export async function pdfSafeText(text: string, style: TextStyle): Promise<{ text: string; image?: RasterText }> {
  const lines = text.split('\n').map((line) => toWinAnsi(line))
  if (lines.some((line) => line.lossy)) return { text, image: await rasterizeText(text, style) }
  return { text: lines.map((line) => line.text).join('\n') }
}

export interface EmbeddableImage {
  bytes: Uint8Array
  format: 'png' | 'jpg'
  width: number
  height: number
}

export async function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } catch {
    throw new Error('This image could not be decoded by the browser.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** PNG and JPEG are embedded as they are; other formats are redrawn as PNG. Large photos are scaled down. */
export async function toEmbeddableImage(blob: Blob, maxEdge = 3000): Promise<EmbeddableImage> {
  const image = await decodeImage(blob)
  const width = image.naturalWidth || 1
  const height = image.naturalHeight || 1
  const native = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/png' ? 'png' : null
  if (native && Math.max(width, height) <= maxEdge) {
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: native, width, height }
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  context2d(canvas).drawImage(image, 0, 0, canvas.width, canvas.height)
  const format = native === 'jpg' ? 'jpg' : 'png'
  const bytes = await canvasBytes(canvas, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9)
  return { bytes, format, width: canvas.width, height: canvas.height }
}

/** Crops transparent margins, e.g. around a drawn signature. Returns null for an empty canvas. */
export function trimCanvas(source: HTMLCanvasElement, padding = 6): HTMLCanvasElement | null {
  const context = context2d(source)
  const { width, height } = source
  const data = context.getImageData(0, 0, width, height).data
  let top = height
  let left = width
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }
  if (right < 0) return null
  left = Math.max(0, left - padding)
  top = Math.max(0, top - padding)
  right = Math.min(width - 1, right + padding)
  bottom = Math.min(height - 1, bottom + padding)
  const out = document.createElement('canvas')
  out.width = right - left + 1
  out.height = bottom - top + 1
  context2d(out).drawImage(source, left, top, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

export async function canvasToEmbeddable(canvas: HTMLCanvasElement): Promise<EmbeddableImage> {
  return { bytes: await canvasBytes(canvas), format: 'png', width: canvas.width, height: canvas.height }
}

/** Renders typed text in a handwriting-style font for a typed signature. */
export function typedSignatureCanvas(text: string, fontFamily: string, color: string): HTMLCanvasElement | null {
  const value = text.trim()
  if (!value) return null
  const size = 96
  const probe = document.createElement('canvas')
  const measure = context2d(probe)
  measure.font = `${size}px ${fontFamily}`
  const width = Math.ceil(measure.measureText(value).width + size * 0.6)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width)
  canvas.height = Math.ceil(size * 1.6)
  const context = context2d(canvas)
  context.font = `${size}px ${fontFamily}`
  context.fillStyle = color
  context.textBaseline = 'middle'
  context.fillText(value, size * 0.3, canvas.height / 2)
  return trimCanvas(canvas)
}

export function bytesToObjectUrl(bytes: Uint8Array, type: string): string {
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }))
}
