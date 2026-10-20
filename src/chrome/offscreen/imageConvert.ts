import { base64ToBytes } from '@/core/engines/htmlArchive'
import { jpegToPdf, type ImageSaveFormat } from '@/core/imageConvert'

const blobUrls = new Set<string>()

/** Converts the image and returns a blob URL the service worker can hand to chrome.downloads. */
export async function convertImageInOffscreen(
  base64: string,
  sourceMime: string,
  format: ImageSaveFormat,
  quality: number,
): Promise<{ url: string; mime: string }> {
  const bytes = base64ToBytes(base64)
  const mime = sourceMime.toLowerCase().split(';')[0].trim()

  if (format === 'gif' && mime === 'image/gif') return toBlobUrl(bytes, 'image/gif')

  const bitmap = await decode(bytes, mime)
  const { width, height } = bitmap
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not available')
  if (format === 'jpg' || format === 'pdf') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0)
  if ('close' in bitmap) bitmap.close()

  if (format === 'gif') {
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
    const { data } = ctx.getImageData(0, 0, width, height)
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    const gif = GIFEncoder()
    gif.writeFrame(index, width, height, { palette })
    gif.finish()
    return toBlobUrl(gif.bytes(), 'image/gif')
  }

  if (format === 'pdf') {
    const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', quality)).arrayBuffer())
    return toBlobUrl(jpegToPdf(jpeg, width, height), 'application/pdf')
  }

  const outMime = format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
  const blob = await canvasToBlob(canvas, outMime, quality)
  return toBlobUrl(new Uint8Array(await blob.arrayBuffer()), outMime)
}

export function releaseImageUrl(url: string): void {
  if (!blobUrls.delete(url)) return
  URL.revokeObjectURL(url)
}

/** createImageBitmap rejects SVG; fall back to an <img> element for those. */
async function decode(bytes: Uint8Array, mime: string): Promise<ImageBitmap | HTMLImageElement> {
  const blob = new Blob([new Uint8Array(bytes)], { type: mime || 'application/octet-stream' })
  try {
    return await createImageBitmap(blob)
  } catch {
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      if (!img.naturalWidth) throw new Error('Unsupported image')
      if (!img.width) {
        img.width = img.naturalWidth
        img.height = img.naturalHeight
      }
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function toBlobUrl(bytes: Uint8Array, mime: string): { url: string; mime: string } {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }))
  blobUrls.add(url)
  return { url, mime }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
      type,
      type === 'image/png' ? undefined : quality,
    )
  })
}
