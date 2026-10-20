import type { ImageSaveFormat } from './types'

const EXT: Record<ImageSaveFormat, string> = {
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
  pdf: 'pdf',
}

/** Safe download basename from page title, image URL, or a generic fallback. */
export function suggestFilename(
  format: ImageSaveFormat,
  opts: { pageTitle?: string; imageUrl?: string; pageUrl?: string },
): string {
  const fromTitle = sanitizeBase(opts.pageTitle)
  if (fromTitle) return `${fromTitle}.${EXT[format]}`

  const fromImage = basenameFromUrl(opts.imageUrl)
  if (fromImage) return swapExtension(fromImage, EXT[format])

  const fromPage = basenameFromUrl(opts.pageUrl)
  if (fromPage) return `${stripExtension(fromPage) || 'image'}.${EXT[format]}`

  return `image-${Date.now()}.${EXT[format]}`
}

function sanitizeBase(title?: string): string {
  if (!title) return ''
  const t = title.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '-').slice(0, 80)
  return t.replace(/\.+$/g, '')
}

function basenameFromUrl(url?: string): string {
  if (!url) return ''
  try {
    const path = new URL(url).pathname
    const name = path.split('/').filter(Boolean).pop() ?? ''
    return sanitizeBase(decodeURIComponent(name))
  } catch {
    return ''
  }
}

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, '')
}

function swapExtension(name: string, ext: string): string {
  const base = stripExtension(name) || 'image'
  return `${base}.${ext}`
}
