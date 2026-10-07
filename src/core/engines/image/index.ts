export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export interface ImageInfo {
  width: number
  height: number
  format: string
  sizeBytes: number
}

export type ImageResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image.'))
    img.src = dataUrl
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

export async function getImageInfo(file: File): Promise<ImageResult<ImageInfo>> {
  try {
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImageFromDataUrl(dataUrl)
    return {
      ok: true,
      value: {
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type || 'unknown',
        sizeBytes: file.size,
      },
    }
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : 'Could not read the image.',
    }
  }
}

export async function resizeImage(
  img: HTMLImageElement,
  width: number,
  height: number,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export async function cropImage(
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

export async function convertImage(
  img: HTMLImageElement,
  format: ImageFormat,
  quality = 0.92,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (ctx && format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx?.drawImage(img, 0, 0)
  return canvas.toDataURL(format, quality)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`
}

export async function pickColorAt(
  img: HTMLImageElement,
  x: number,
  y: number,
): Promise<ImageResult<string>> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, error: 'Canvas unavailable.' }
    ctx.drawImage(img, 0, 0)
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data
    const hex = `#${[pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`
    return { ok: true, value: hex }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not read pixel.' }
  }
}

export async function imageToBase64(file: File): Promise<ImageResult<string>> {
  try {
    return { ok: true, value: await fileToDataUrl(file) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not read the file.' }
  }
}
