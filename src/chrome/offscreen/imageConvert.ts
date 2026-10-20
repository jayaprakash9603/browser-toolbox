import { bytesToBase64, base64ToBytes } from '@/core/engines/htmlArchive'
import type { ImageSaveFormat } from '@/core/imageConvert'

type ConvertResult = {
  base64: string
  mime: string
  width: number
  height: number
  forPdf?: boolean
}

export async function convertImageInOffscreen(
  base64: string,
  sourceMime: string,
  format: ImageSaveFormat,
  quality: number,
): Promise<ConvertResult> {
  const bytes = base64ToBytes(base64)
  const mime = sourceMime.toLowerCase()

  if (format === 'gif' && mime.includes('gif')) {
    return { base64, mime: 'image/gif', width: 0, height: 0 }
  }

  const blob = new Blob([new Uint8Array(bytes)], { type: mime || 'application/octet-stream' })
  const bitmap = await createImageBitmap(blob)
  const width = bitmap.width
  const height = bitmap.height
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
  bitmap.close()

  if (format === 'gif') {
    const { GIFEncoder, quantize } = await import('gifenc')
    const { data } = ctx.getImageData(0, 0, width, height)
    const { palette, indices } = quantize(data, 256)
    const gif = GIFEncoder()
    gif.writeFrame(indices, width, height, { palette })
    gif.finish()
    const out = gif.bytes()
    return { base64: bytesToBase64(out), mime: 'image/gif', width, height }
  }

  const outMime =
    format === 'jpg' || format === 'pdf' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
  const outBlob = await canvasToBlob(canvas, outMime, quality)
  const outBytes = new Uint8Array(await outBlob.arrayBuffer())
  return {
    base64: bytesToBase64(outBytes),
    mime: outMime,
    width,
    height,
    forPdf: format === 'pdf',
  }
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
